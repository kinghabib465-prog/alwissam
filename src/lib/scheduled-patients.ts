import { prisma } from "@/lib/db/prisma";
import {
  algiersYmdBounds,
  formatClinicAppointmentDay,
} from "@/lib/clinic-date";
import { toLatinDigits } from "@/lib/latin-digits";

/** صف واحد في القائمة = موعد قادم واحد للمريض */
export type ScheduledPatientRow = {
  patientId: string;
  patientName: string;
  phone: string;
  /** ملخص السطر في القائمة */
  nextLabel: string;
  /** تفاصيل عند الضغط */
  detail: {
    appointmentId: string;
    /** تاريخ/وقت جلسة المعاينة الأخيرة (ما تم) */
    lastVisitDateLabel: string | null;
    lastVisitTimeLabel: string | null;
    visitReason: string | null;
    /** ما عمله الطبيب في المعاينة */
    workPerformed: string | null;
    /** الموعد القادم */
    nextDateLabel: string;
    nextTimeLabel: string;
    /** ما سيفعله في الحصة القادمة */
    nextPlan: string | null;
  };
};

const UPCOMING = ["CONFIRMED", "REMINDER_SENT", "DOCTOR_ASSIGNED"] as const;
const SESSION_DONE = [
  "COMPLETED",
  "FOLLOW_UP_REQUIRED",
  "IN_TREATMENT",
] as const;

function todayAlgiersYmd() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatClock(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Algiers",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hh = parts.find((p) => p.type === "hour")?.value || "00";
  const mm = parts.find((p) => p.type === "minute")?.value || "00";
  return toLatinDigits(`${hh}:${mm}`);
}

function isUpcoming(status: string) {
  return UPCOMING.includes(status as (typeof UPCOMING)[number]);
}

/**
 * مريض واحد → موعد قادم واحد.
 * عند الفتح: ما تم في المعاينة + ما سيفعله الطبيب في الحصة القادمة.
 */
export async function loadScheduledPatientsWithVisits(
  doctorId: string,
): Promise<ScheduledPatientRow[]> {
  const { start: todayStart } = algiersYmdBounds(todayAlgiersYmd());

  const upcomingApts = await prisma.appointment.findMany({
    where: {
      doctorId,
      deletedAt: null,
      status: { in: [...UPCOMING] },
      startAt: { gte: todayStart },
    },
    include: {
      patient: { select: { id: true, fullName: true, phone: true, deletedAt: true } },
    },
    orderBy: { startAt: "asc" },
  });

  // موعد قادم واحد لكل مريض (الأقرب)
  const byPatient = new Map<string, (typeof upcomingApts)[number]>();
  for (const a of upcomingApts) {
    if (a.patient.deletedAt) continue;
    if (!byPatient.has(a.patientId)) byPatient.set(a.patientId, a);
  }

  const rows: ScheduledPatientRow[] = [];

  for (const next of byPatient.values()) {
    const lastSession = await prisma.appointment.findFirst({
      where: {
        patientId: next.patientId,
        doctorId,
        deletedAt: null,
        id: { not: next.id },
        OR: [
          { status: { in: [...SESSION_DONE] } },
          { workPerformed: { not: null } },
          { visitReason: { not: null } },
        ],
      },
      orderBy: { startAt: "desc" },
    });

    // التفاصيل: من الجلسة السابقة إن وُجدت، وإلا من الموعد نفسه (حجز مباشر)
    const workPerformed =
      lastSession?.workPerformed || next.workPerformed || null;
    const visitReason = lastSession?.visitReason || next.visitReason || null;
    const nextPlan = lastSession?.followUpNote || next.followUpNote || null;

    const lastDateSrc = lastSession?.startAt || null;

    rows.push({
      patientId: next.patientId,
      patientName: next.patient.fullName,
      phone: next.patient.phone,
      nextLabel: `${formatClinicAppointmentDay(next.startAt)} · ${formatClock(next.startAt)}`,
      detail: {
        appointmentId: next.id,
        lastVisitDateLabel: lastDateSrc
          ? formatClinicAppointmentDay(lastDateSrc)
          : null,
        lastVisitTimeLabel: lastDateSrc ? formatClock(lastDateSrc) : null,
        visitReason,
        workPerformed,
        nextDateLabel: formatClinicAppointmentDay(next.startAt),
        nextTimeLabel: formatClock(next.startAt),
        nextPlan,
      },
    });
  }

  rows.sort((a, b) => a.patientName.localeCompare(b.patientName, "ar"));
  return rows;
}

/** @deprecated alias للتوافق مع الاستيرادات القديمة */
export type ScheduledPatientGroup = ScheduledPatientRow & {
  cards?: never;
};
