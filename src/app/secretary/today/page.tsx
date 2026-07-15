import { requireUser } from "@/lib/auth/current-user";
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
import {
  buildSecretaryDoctorOptions,
  loadSecretaryDoctorsForDay,
} from "@/lib/resolve-clinic-doctors";

export const dynamic = "force-dynamic";

function mapApt(
  apt: Awaited<
    ReturnType<typeof listSecretaryTodayPendingCheckIns>
  >["morning"][number],
) {
  const period = periodFromStartAt(apt.startAt);
  return {
    id: apt.id,
    fullName: apt.patient.fullName?.trim() || "—",
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

export default async function SecretaryTodayAppointmentsPage() {
  const user = await requireUser(["SECRETARY", "ADMIN"]);
  const today = algiersWeekday();
  const todayPending = await listSecretaryTodayPendingCheckIns();
  const doctors = await loadSecretaryDoctorsForDay(today);
  const preferIds = [
    ...todayPending.morning.map((a) => a.doctorId),
    ...todayPending.evening.map((a) => a.doctorId),
  ];
  const doctorOpts = buildSecretaryDoctorOptions(doctors, preferIds).filter(
    (d) => doctors.find((x) => x.id === d.id)?.isActive !== false,
  );

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
