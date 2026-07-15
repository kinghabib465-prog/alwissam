import { prisma } from "@/lib/db/prisma";
import { algiersDayBounds } from "@/lib/daily-queue";
import { DayOfWeek } from "@prisma/client";
import {
  currentClinicShift,
  type ClinicShiftCode,
} from "@/lib/clinic-shifts";
import { periodFromStartAt, type WorkShift } from "@/lib/doctor-availability";

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

export type SecretaryTodayAppointment = Awaited<
  ReturnType<typeof listSecretaryTodayPendingCheckIns>
>["all"][number];

/**
 * مواعيد اليوم بانتظار التوجيه — يوم الموعد فقط (توقيت الجزائر).
 * بدون حساب مريض — يكفي الموعد الذي حجزه الطبيب.
 */
export async function listSecretaryTodayPendingCheckIns() {
  const { start, end, ymd } = algiersDayBounds();
  const clinicShift = currentClinicShift();

  const [appointments, activeWaiting] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        deletedAt: null,
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
  const all = [];

  for (const apt of appointments) {
    if (busyPatientIds.has(apt.patientId)) continue;
    if (seenPatients.has(apt.patientId)) continue;
    seenPatients.add(apt.patientId);
    all.push(apt);
  }

  const morning = all.filter(
    (a) => periodFromStartAt(a.startAt) === "MORNING",
  );
  const evening = all.filter(
    (a) => periodFromStartAt(a.startAt) === "EVENING",
  );
  // DAY أو غير ذلك يُعامل كصباحي للعرض
  const other = all.filter((a) => {
    const p = periodFromStartAt(a.startAt);
    return p !== "MORNING" && p !== "EVENING";
  });
  const morningAll = [...morning, ...other];

  /** القائمة الظاهرة الآن: صباح في الصباح · مساء في المساء */
  let pending = all;
  let activePeriod: ClinicShiftCode | WorkShift | null = clinicShift;
  if (clinicShift === "MORNING") {
    pending = morningAll;
  } else if (clinicShift === "EVENING") {
    pending = evening;
  } else {
    // خارج الدوام: لا تُفرض فترة — نعرض الكل مع تسمية
    pending = all;
    activePeriod = null;
  }

  return {
    start,
    end,
    ymd,
    clinicShift,
    activePeriod,
    all,
    morning: morningAll,
    evening,
    /** مرادف متوافق: المواعيد للعرض حسب الفترة الحالية */
    pending,
  };
}

export async function countSecretaryTodayPendingCheckIns() {
  const { pending } = await listSecretaryTodayPendingCheckIns();
  return pending.length;
}
