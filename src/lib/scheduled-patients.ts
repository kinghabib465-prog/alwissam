import { prisma } from "@/lib/db/prisma";
import {
  algiersYmdBounds,
  formatClinicAppointmentDay,
} from "@/lib/clinic-date";
import { toLatinDigits } from "@/lib/latin-digits";

export type VisitTimelineCard = {
  id: string;
  index: number;
  dateLabel: string;
  timeLabel: string;
  patientName: string;
  visitReason: string | null;
  workPerformed: string | null;
  statusLabel: string;
  treatmentFinished: boolean;
  nextDateLabel: string | null;
  nextTimeLabel: string | null;
  followUpNote: string | null;
};

export type ScheduledPatientGroup = {
  patientId: string;
  patientName: string;
  phone: string;
  nextLabel: string;
  cards: VisitTimelineCard[];
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

function isUpcomingStatus(status: string) {
  return UPCOMING.includes(status as (typeof UPCOMING)[number]);
}

function isSessionDoneStatus(status: string) {
  return SESSION_DONE.includes(status as (typeof SESSION_DONE)[number]);
}

/**
 * مرضى لديهم موعد (اليوم أو لاحقاً) عند هذا الطبيب — بطاقات الجلسات كالصورة.
 */
export async function loadScheduledPatientsWithVisits(
  doctorId: string,
): Promise<ScheduledPatientGroup[]> {
  const { start: todayStart } = algiersYmdBounds(todayAlgiersYmd());

  // موعد «اليوم» يبقى ظاهراً حتى لو انطلقت ساعة بداية الفترة (صباح/مساء)
  const upcoming = await prisma.appointment.findMany({
    where: {
      doctorId,
      deletedAt: null,
      status: { in: [...UPCOMING] },
      startAt: { gte: todayStart },
    },
    select: { patientId: true },
    distinct: ["patientId"],
    orderBy: { startAt: "asc" },
  });
  const patientIds = upcoming.map((a) => a.patientId);
  if (patientIds.length === 0) return [];

  const patients = await prisma.patient.findMany({
    where: { id: { in: patientIds }, deletedAt: null },
    include: {
      appointments: {
        where: {
          doctorId,
          deletedAt: null,
          OR: [
            { status: { in: [...SESSION_DONE] } },
            { status: { in: [...UPCOMING] }, startAt: { gte: todayStart } },
            { workPerformed: { not: null } },
            { visitReason: { not: null } },
            { treatmentFinished: true },
          ],
        },
        orderBy: { startAt: "asc" },
        take: 50,
      },
    },
    orderBy: { fullName: "asc" },
  });

  return patients.map((p) => {
    const apts = p.appointments;
    const nextUpcoming =
      [...apts]
        .filter((a) => isUpcomingStatus(a.status) && a.startAt >= todayStart)
        .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0] || null;

    const sessionCards = apts.filter(
      (a) =>
        a.treatmentFinished ||
        !!a.workPerformed ||
        !!a.visitReason ||
        isSessionDoneStatus(a.status),
    );

    const cards: VisitTimelineCard[] = [];

    for (let i = 0; i < sessionCards.length; i++) {
      const a = sessionCards[i]!;
      const chronologicalNext =
        apts.find(
          (x) =>
            x.id !== a.id &&
            x.startAt.getTime() > a.startAt.getTime() &&
            (isUpcomingStatus(x.status) || isSessionDoneStatus(x.status)),
        ) || null;

      const isFutureShell =
        isUpcomingStatus(a.status) &&
        a.startAt >= todayStart &&
        (!!a.workPerformed || !!a.visitReason) &&
        !isSessionDoneStatus(a.status);

      // موعد قادم يحمل تفاصيل الجلسة (حجز مباشر بدون جلسة سابقة):
      // الجانب الأيمن = ما تم / السبب، والأيسر = موعده نفسه
      if (isFutureShell) {
        cards.push({
          id: a.id,
          index: cards.length + 1,
          dateLabel: formatClinicAppointmentDay(a.updatedAt || a.createdAt),
          timeLabel: formatClock(a.updatedAt || a.createdAt),
          patientName: p.fullName,
          visitReason: a.visitReason,
          workPerformed: a.workPerformed,
          statusLabel: a.workPerformed ? "تمت المعالجة" : "موعد مسجّل",
          treatmentFinished: false,
          nextDateLabel: formatClinicAppointmentDay(a.startAt),
          nextTimeLabel: formatClock(a.startAt),
          followUpNote: a.followUpNote,
        });
        continue;
      }

      const nextApt =
        chronologicalNext && isUpcomingStatus(chronologicalNext.status)
          ? chronologicalNext
          : nextUpcoming && nextUpcoming.id !== a.id
            ? nextUpcoming
            : chronologicalNext;

      const showNext = !a.treatmentFinished && !!nextApt && nextApt.id !== a.id;

      cards.push({
        id: a.id,
        index: cards.length + 1,
        dateLabel: formatClinicAppointmentDay(a.startAt),
        timeLabel: formatClock(a.startAt),
        patientName: p.fullName,
        visitReason: a.visitReason,
        workPerformed: a.workPerformed,
        statusLabel: a.treatmentFinished
          ? "انتهاء العلاج"
          : a.workPerformed
            ? "تمت المعالجة"
            : "جلسة مسجّلة",
        treatmentFinished: a.treatmentFinished,
        nextDateLabel: showNext
          ? formatClinicAppointmentDay(nextApt!.startAt)
          : null,
        nextTimeLabel: showNext ? formatClock(nextApt!.startAt) : null,
        followUpNote: showNext
          ? a.followUpNote || nextApt!.followUpNote
          : a.followUpNote,
      });
    }

    // موعد قادم فقط بدون تفاصيل بعد — بطاقة أساسية حتى يظهر المريض فوراً
    if (cards.length === 0 && nextUpcoming) {
      cards.push({
        id: nextUpcoming.id,
        index: 1,
        dateLabel: formatClinicAppointmentDay(nextUpcoming.startAt),
        timeLabel: formatClock(nextUpcoming.startAt),
        patientName: p.fullName,
        visitReason: nextUpcoming.visitReason,
        workPerformed: nextUpcoming.workPerformed,
        statusLabel: "موعد قادم",
        treatmentFinished: false,
        nextDateLabel: formatClinicAppointmentDay(nextUpcoming.startAt),
        nextTimeLabel: formatClock(nextUpcoming.startAt),
        followUpNote: nextUpcoming.followUpNote,
      });
    }

    return {
      patientId: p.id,
      patientName: p.fullName,
      phone: p.phone,
      nextLabel: nextUpcoming
        ? `${formatClinicAppointmentDay(nextUpcoming.startAt)} · ${formatClock(nextUpcoming.startAt)}`
        : "—",
      cards,
    };
  });
}
