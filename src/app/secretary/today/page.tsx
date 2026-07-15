import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { appointmentTypeAr, navSecretaryAr } from "@/i18n/ar";
import { SecretaryAutoRefresh } from "@/components/secretary/SecretaryAutoRefresh";
import { SecretaryTodayAppointmentsDrop } from "@/components/secretary/SecretaryTodayAppointmentsDrop";
import {
  algiersWeekday,
  listSecretaryTodayPendingCheckIns,
} from "@/lib/secretary-today";
import { formatClinicDate } from "@/lib/clinic-date";
import { periodFromStartAt } from "@/lib/doctor-availability";
import { CLINIC_SHIFT_HOURS } from "@/lib/clinic-shifts";

export const dynamic = "force-dynamic";

function mapApt(
  apt: Awaited<
    ReturnType<typeof listSecretaryTodayPendingCheckIns>
  >["morning"][number],
) {
  const period = periodFromStartAt(apt.startAt);
  return {
    id: apt.id,
    fullName: apt.patient.fullName,
    phone: apt.patient.phone,
    age: apt.patient.age,
    city: apt.patient.city,
    doctorId: apt.doctorId,
    doctorName: apt.doctor.user.fullName,
    startAtIso: apt.startAt.toISOString(),
    appointmentTypeLabel:
      appointmentTypeAr[apt.appointmentType] || apt.appointmentType,
    period:
      period === "EVENING"
        ? ("EVENING" as const)
        : period === "DAY"
          ? ("DAY" as const)
          : ("MORNING" as const),
  };
}

/** صفحة مواعيد اليوم — خانة منسدلة + توجيه بدون فتح حساب */
export default async function SecretaryTodayAppointmentsPage() {
  const user = await requireUser(["SECRETARY", "ADMIN"]);
  const today = algiersWeekday();
  const todayPending = await listSecretaryTodayPendingCheckIns();

  const doctors = await prisma.doctor.findMany({
    where: { isActive: true },
    include: {
      user: true,
      workingHours: {
        where: { isActive: true, dayOfWeek: today },
        take: 1,
      },
    },
    orderBy: { type: "asc" },
  });

  const present = doctors.filter((d) => d.workingHours.length > 0);
  const doctorSource = present.length > 0 ? present : doctors;
  const doctorOpts = doctorSource.map((d) => ({
    id: d.id,
    name: d.user.fullName,
    type: d.type,
  }));

  const todayLabel = formatClinicDate(todayPending.start);
  const morning = CLINIC_SHIFT_HOURS.MORNING;
  const evening = CLINIC_SHIFT_HOURS.EVENING;

  return (
    <DashboardShell items={navSecretaryAr as never} userName={user.fullName}>
      <SecretaryAutoRefresh seconds={8} />
      <TopHeader
        title="مواعيد اليوم"
        subtitle={`${todayLabel} · صباح ${morning.start}–${morning.end} · مساء ${evening.start}–${evening.end}`}
      />
      <SecretaryTodayAppointmentsDrop
        todayLabel={todayLabel}
        clinicShift={todayPending.clinicShift}
        morning={todayPending.morning.map(mapApt)}
        evening={todayPending.evening.map(mapApt)}
        doctors={doctorOpts}
        csrfToken={user.csrfToken}
        defaultOpen
      />
    </DashboardShell>
  );
}
