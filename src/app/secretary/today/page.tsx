import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { appointmentTypeAr, navSecretaryAr } from "@/i18n/ar";
import { SecretaryScheduledBar } from "@/components/secretary/SecretaryScheduledBar";
import { SecretaryAutoRefresh } from "@/components/secretary/SecretaryAutoRefresh";
import { listSecretaryTodayPendingCheckIns } from "@/lib/secretary-today";
import { formatClinicDate } from "@/lib/clinic-date";
import { DayOfWeek } from "@prisma/client";
import { toLatinDigits } from "@/lib/latin-digits";
import { formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DAY_MAP: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

/**
 * مواعيد اليوم — فقط من يجب إدخالهم للطبيب (لم يدخلوا الانتظار بعد)
 */
export default async function SecretaryTodayAppointmentsPage() {
  const user = await requireUser(["SECRETARY", "ADMIN"]);
  const today = DAY_MAP[new Date().getDay()]!;
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
        subtitle={`${todayLabel} — مرضى لديهم موعد اليوم ولم يُدخلوا بعد`}
      />
      <Card>
        {pending.length === 0 ? (
          <EmptyState
            title="لا أحد بانتظار الإدخال"
            description="المرضى الموجودون في العيادة أو المنتهون لا يظهرون هنا. من يُحجز له موعد وهو داخل العيادة ينتظر موعده التالي دون تكرار."
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-bold text-teal">
              بانتظار الإدخال: {toLatinDigits(pending.length)}
            </p>
            <p className="text-xs text-muted">
              مرتّبون حسب وقت الموعد — مريض واحد لكل صف، دون إعادة من أُدخل أو أنهى
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
                  appointmentTypeAr[apt.appointmentType] || apt.appointmentType
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
                {toLatinDigits(formatTime(apt.startAt))}
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
