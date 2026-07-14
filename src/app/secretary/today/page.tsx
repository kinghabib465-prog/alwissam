import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { appointmentTypeAr, navSecretaryAr } from "@/i18n/ar";
import { SecretaryScheduledBar } from "@/components/secretary/SecretaryScheduledBar";
import { SecretaryAutoRefresh } from "@/components/secretary/SecretaryAutoRefresh";
import { algiersDayBounds } from "@/lib/daily-queue";
import { formatClinicDate } from "@/lib/clinic-date";
import { DayOfWeek } from "@prisma/client";

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
 * مواعيد اليوم — كل المواعيد التي تاريخها اليوم
 * (الصباحي يجدها فور الدخول دون انتظار حلول الساعة)
 */
export default async function SecretaryTodayAppointmentsPage() {
  const user = await requireUser(["SECRETARY", "ADMIN"]);
  const { start, end } = algiersDayBounds();
  const today = DAY_MAP[new Date().getDay()]!;

  const [appointments, doctors] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        deletedAt: null,
        startAt: { gte: start, lt: end },
        status: {
          in: [
            "CONFIRMED",
            "REMINDER_SENT",
            "DOCTOR_ASSIGNED",
            "PATIENT_ARRIVED",
            "WAITING_ROOM",
          ],
        },
        patient: { deletedAt: null },
        OR: [
          { waitingRoomEntry: null },
          { waitingRoomEntry: { status: "LEFT" } },
        ],
      },
      include: {
        patient: { include: { account: true } },
        doctor: { include: { user: true } },
        waitingRoomEntry: true,
      },
      orderBy: { startAt: "asc" },
      take: 100,
    }),
    prisma.doctor.findMany({
      where: { isActive: true },
      include: {
        user: true,
        workingHours: {
          where: { isActive: true, dayOfWeek: today },
          take: 1,
        },
      },
      orderBy: { type: "asc" },
    }),
  ]);

  // فقط من لم يدخل الانتظار بعد
  const pending = appointments.filter(
    (a) =>
      !a.waitingRoomEntry ||
      a.waitingRoomEntry.status === "LEFT",
  );

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
        subtitle={`${todayLabel} — كل المواعيد التي وصل تاريخها اليوم`}
      />
      <Card>
        {pending.length === 0 ? (
          <EmptyState
            title="لا مواعيد لهذا اليوم"
            description="عند حلول تاريخ موعد يحدده الطبيب يظهر هنا للسكرتير فورًا."
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-bold text-teal">
              بانتظار الإدخال: {pending.length}
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
    </DashboardShell>
  );
}
