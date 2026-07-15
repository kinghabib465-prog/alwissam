import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { appointmentTypeAr, navSecretaryAr } from "@/i18n/ar";
import { SecretaryScheduledBar } from "@/components/secretary/SecretaryScheduledBar";
import { SecretaryAutoRefresh } from "@/components/secretary/SecretaryAutoRefresh";
import {
  algiersWeekday,
  listSecretaryTodayPendingCheckIns,
} from "@/lib/secretary-today";
import { formatClinicDate } from "@/lib/clinic-date";
import { toLatinDigits } from "@/lib/latin-digits";
import {
  periodFromStartAt,
  SHIFT_LABEL_AR,
} from "@/lib/doctor-availability";

export const dynamic = "force-dynamic";

/**
 * مواعيد اليوم — فقط من يجب إدخالهم للطبيب (وصل يوم موعدهم)
 */
export default async function SecretaryTodayAppointmentsPage() {
  const user = await requireUser(["SECRETARY", "ADMIN"]);
  const today = algiersWeekday();
  const { start, pending } = await listSecretaryTodayPendingCheckIns();

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

  const todayLabel = formatClinicDate(start);

  return (
    <DashboardShell items={navSecretaryAr as never} userName={user.fullName}>
      <SecretaryAutoRefresh seconds={8} />
      <TopHeader
        title="مواعيد اليوم"
        subtitle={`${todayLabel} — مواعيد حدّدها الطبيب وتظهر فقط في يومها`}
      />
      <Card>
        {pending.length === 0 ? (
          <EmptyState
            title="لا أحد بانتظار الإدخال"
            description="عند حلول يوم الموعد يظهر المريض هنا. بعد الإدخال يختفي من هذه القائمة."
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-bold text-teal">
              بانتظار الإدخال: {toLatinDigits(pending.length)}
            </p>
            <p className="text-xs text-muted">
              مرتّبون صباح ثم مساء — مريض واحد لكل صف
            </p>
            {pending.map((apt, index) => (
              <SecretaryScheduledBar
                key={apt.id}
                appointmentId={apt.id}
                fullName={apt.patient.fullName}
                phone={apt.patient.phone}
                age={apt.patient.age}
                city={apt.patient.city}
                doctorId={apt.doctorId}
                doctorName={apt.doctor.user.fullName}
                startAtIso={apt.startAt.toISOString()}
                appointmentTypeLabel={
                  appointmentTypeAr[apt.appointmentType] ||
                  apt.appointmentType
                }
                queueOrder={index + 1}
                doctors={doctorOpts}
                csrfToken={user.csrfToken}
              />
            ))}
          </div>
        )}
      </Card>

      {pending.length > 0 ? (
        <Card className="mt-4">
          <p className="mb-2 text-sm font-bold text-navy">ملخص سريع</p>
          <ul className="space-y-1 text-sm text-muted">
            {pending.map((apt, index) => (
              <li key={`sum-${apt.id}`}>
                {toLatinDigits(index + 1)}. {apt.patient.fullName}
                {" — "}
                {SHIFT_LABEL_AR[periodFromStartAt(apt.startAt)]}
                {" · "}
                {apt.doctor.user.fullName}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </DashboardShell>
  );
}
