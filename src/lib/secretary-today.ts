import { prisma } from "@/lib/db/prisma";
import { algiersDayBounds } from "@/lib/daily-queue";
import { DayOfWeek } from "@prisma/client";

/** مواعيد تنتظر إدخال السكرتارية فقط — ليست في الانتظار/المعاينة/تمت */
const PENDING_CHECKIN_STATUSES = [
  "CONFIRMED",
  "REMINDER_SENT",
  "DOCTOR_ASSIGNED",
] as const;

const ACTIVE_WAITING_STATUSES = [
  "ARRIVED",
  "WAITING",
  "WITH_DOCTOR",
  "SESSION_DONE",
] as const;

const DAY_MAP: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

/** يوم الأسبوع الحالي بتوقيت الجزائر */
export function algiersWeekday(now = new Date()): DayOfWeek {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const d = Number(parts.find((p) => p.type === "day")!.value);
  const idx = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
  return DAY_MAP[idx]!;
}

/**
 * مواعيد اليوم بانتظار الإدخال — منظّمة بدون تكرار:
 * تظهر للسكرتير في يوم الموعد فقط (توقيت الجزائر).
 */
export async function listSecretaryTodayPendingCheckIns() {
  const { start, end, ymd } = algiersDayBounds();

  const [appointments, activeWaiting] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        deletedAt: null,
        // كل المواعيد التي يقع توقيتها في يوم الجزائر الحالي
        startAt: { gte: start, lt: end },
        status: { in: [...PENDING_CHECKIN_STATUSES] },
        waitingRoomEntry: { is: null },
        patient: { deletedAt: null },
      },
      include: {
        patient: {
          include: {
            account: true,
            appointmentRequests: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
        doctor: { include: { user: true } },
        waitingRoomEntry: true,
      },
      orderBy: { startAt: "asc" },
      take: 200,
    }),
    prisma.waitingRoomEntry.findMany({
      where: {
        status: { in: [...ACTIVE_WAITING_STATUSES] },
        arrivedAt: { gte: start },
      },
      select: { patientId: true },
    }),
  ]);

  const busyPatientIds = new Set(activeWaiting.map((e) => e.patientId));

  const seenPatients = new Set<string>();
  const pending = [];

  for (const apt of appointments) {
    if (busyPatientIds.has(apt.patientId)) continue;
    if (seenPatients.has(apt.patientId)) continue;
    seenPatients.add(apt.patientId);
    pending.push(apt);
  }

  return { start, end, ymd, pending };
}

export async function countSecretaryTodayPendingCheckIns() {
  const { pending } = await listSecretaryTodayPendingCheckIns();
  return pending.length;
}
