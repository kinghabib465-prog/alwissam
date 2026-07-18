import { prisma } from "@/lib/db/prisma";
import { algiersDayBounds } from "@/lib/daily-queue";
import { DayOfWeek } from "@prisma/client";
import { currentClinicShift } from "@/lib/clinic-shifts";
import { periodFromStartAt } from "@/lib/doctor-availability";
import { IN_CLINIC_BUSY_STATUSES } from "@/lib/clinic-day-tracking";

/** مواعيد تنتظر التوجيه في يومها */
const PENDING_CHECKIN_STATUSES = [
  "CONFIRMED",
  "REMINDER_SENT",
  "DOCTOR_ASSIGNED",
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
 * مواعيد اليوم بانتظار التوجيه.
 * - يوم الجزائر فقط
 * - صف لكل موعد (ليس لكل مريض)
 * - يستبعد من هو داخل العيادة الآن فقط
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
        OR: [
          { waitingRoomEntry: { is: null } },
          { waitingRoomEntry: { status: "LEFT" } },
        ],
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
        status: { in: [...IN_CLINIC_BUSY_STATUSES] },
        arrivedAt: { gte: start, lt: end },
      },
      select: { patientId: true },
    }),
  ]);

  const busyPatientIds = new Set(activeWaiting.map((e) => e.patientId));
  type AptRow = (typeof appointments)[number];
  const all: AptRow[] = [];

  for (const apt of appointments) {
    // مريض داخل المعاينة/الانتظار الآن — لا تُظهر موعده الثاني كـ «وصل»
    if (busyPatientIds.has(apt.patientId)) continue;
    all.push(apt);
  }

  function byTimeThenName(a: AptRow, b: AptRow) {
    const t = a.startAt.getTime() - b.startAt.getTime();
    if (t !== 0) return t;
    return a.patient.fullName.localeCompare(b.patient.fullName, "ar", {
      sensitivity: "base",
    });
  }

  const morning = all
    .filter((a) => {
      const p = periodFromStartAt(a.startAt);
      return p === "MORNING" || p === "DAY";
    })
    .sort(byTimeThenName);
  const evening = all
    .filter((a) => periodFromStartAt(a.startAt) === "EVENING")
    .sort(byTimeThenName);

  // القائمة حسب الفترة الحالية للتبسيط — مع الإبقاء على المتأخرين
  let pending = [...morning, ...evening];
  if (clinicShift === "MORNING") {
    pending = morning;
  } else if (clinicShift === "EVENING") {
    // مساءً: المسائي + أي صباحي لم يُوجَّه بعد (متأخر)
    pending = [...morning, ...evening];
  }

  return {
    start,
    end,
    ymd,
    clinicShift,
    activePeriod: clinicShift,
    all: [...morning, ...evening],
    morning,
    evening,
    pending,
  };
}

export async function countSecretaryTodayPendingCheckIns() {
  const { pending } = await listSecretaryTodayPendingCheckIns();
  return pending.length;
}
