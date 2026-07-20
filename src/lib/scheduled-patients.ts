import { prisma } from "@/lib/db/prisma";
import { formatClinicAppointmentDay } from "@/lib/clinic-date";
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

/**
 * مرضى لديهم موعد قادم عند هذا الطبيب — مع بطاقات جلسات العلاج.
 */
export async function loadScheduledPatientsWithVisits(
  doctorId: string,
): Promise<ScheduledPatientGroup[]> {
  const now = new Date();
  const upcoming = await prisma.appointment.findMany({
    where: {
      doctorId,
      deletedAt: null,
      status: { in: [...UPCOMING] },
      startAt: { gte: now },
    },
    select: { patientId: true },
    distinct: ["patientId"],
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
            { status: { in: [...UPCOMING] }, startAt: { gte: now } },
            { workPerformed: { not: null } },
            { treatmentFinished: true },
          ],
        },
        orderBy: { startAt: "asc" },
        take: 40,
      },
    },
    orderBy: { fullName: "asc" },
  });

  return patients.map((p) => {
    const apts = p.appointments;
    const nextUpcoming = [...apts]
      .reverse()
      .find(
        (a) =>
          UPCOMING.includes(a.status as (typeof UPCOMING)[number]) &&
          a.startAt >= now,
      );
    const cards: VisitTimelineCard[] = apts
      .filter(
        (a) =>
          a.workPerformed ||
          a.visitReason ||
          a.treatmentFinished ||
          SESSION_DONE.includes(a.status as (typeof SESSION_DONE)[number]),
      )
      .map((a, i, list) => {
        const next = list[i + 1] || nextUpcoming;
        const nextIsDifferent = next && next.id !== a.id;
        const showNext =
          !a.treatmentFinished &&
          !!nextIsDifferent &&
          (UPCOMING.includes(next!.status as (typeof UPCOMING)[number]) ||
            next!.startAt > a.startAt);

        return {
          id: a.id,
          index: i + 1,
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
            ? formatClinicAppointmentDay(next!.startAt)
            : null,
          nextTimeLabel: showNext ? formatClock(next!.startAt) : null,
          followUpNote: a.followUpNote || (showNext ? next!.followUpNote : null),
        };
      });

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
