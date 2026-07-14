import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState, StatusBadge } from "@/components/ui/Card";
import { appointmentStatusAr, appointmentTypeAr, navSecretaryAr } from "@/i18n/ar";
import { formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SecretaryCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser(["SECRETARY", "ADMIN"]);
  const params = await searchParams;
  const base = params.date ? new Date(params.date) : new Date();
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(base);
  end.setHours(23, 59, 59, 999);

  const [doctors, appointments] = await Promise.all([
    prisma.doctor.findMany({
      where: { isActive: true },
      include: { user: true },
      orderBy: { type: "desc" },
    }),
    prisma.appointment.findMany({
      where: {
        startAt: { gte: start, lte: end },
        deletedAt: null,
      },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
      orderBy: { startAt: "asc" },
    }),
  ]);

  return (
    <DashboardShell items={navSecretaryAr as never} userName={user.fullName}>
      <TopHeader title="التقويم" subtitle="عرض يومي حسب الطبيب — بيانات حقيقية" />
      <div className="grid gap-4 lg:grid-cols-2">
        {doctors.map((doctor) => {
          const list = appointments.filter((a) => a.doctorId === doctor.id);
          return (
            <Card key={doctor.id}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold text-navy">{doctor.user.fullName}</h2>
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: doctor.colorCode }}
                />
              </div>
              {list.length === 0 ? (
                <EmptyState title="لا مواعيد في هذا اليوم" />
              ) : (
                <div className="space-y-2">
                  {list.map((apt) => (
                    <div
                      key={apt.id}
                      className="rounded-2xl border border-border p-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{apt.patient.fullName}</p>
                        <span className="font-latin">{formatTime(apt.startAt)}</span>
                      </div>
                      <p className="text-xs text-muted">
                        {appointmentTypeAr[apt.appointmentType]}
                      </p>
                      <div className="mt-2">
                        <StatusBadge
                          label={appointmentStatusAr[apt.status]}
                          tone={apt.isEmergency ? "danger" : "teal"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </DashboardShell>
  );
}
