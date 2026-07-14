import {
  Activity,
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  Users,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { getDashboardStats } from "@/lib/services/appointments";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState, StatCard, StatusBadge } from "@/components/ui/Card";
import {
  appointmentStatusAr,
  appointmentTypeAr,
  navDoctorGeneralAr,
  navDoctorSpecialistAr,
} from "@/i18n/ar";
import { formatTime } from "@/lib/utils";

export async function DoctorDashboardView({
  type,
}: {
  type: "GENERAL" | "SPECIALIST";
}) {
  const role = type === "GENERAL" ? "DOCTOR_GENERAL" : "DOCTOR_SPECIALIST";
  const user = await requireUser([role, "ADMIN"]);
  const doctor = await prisma.doctor.findFirst({ where: { userId: user.id } });
  const doctorId = doctor?.id;
  const stats = await getDashboardStats({ doctorId });
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const appointments = doctorId
    ? await prisma.appointment.findMany({
        where: { doctorId, startAt: { gte: start, lte: end }, deletedAt: null },
        include: { patient: true },
        orderBy: { startAt: "asc" },
      })
    : [];

  const waiting = doctorId
    ? await prisma.waitingRoomEntry.findMany({
        where: { doctorId, status: { in: ["ARRIVED", "WAITING"] } },
        include: { patient: true },
        orderBy: { arrivedAt: "asc" },
      })
    : [];

  const specialistExtras =
    type === "SPECIALIST" && doctorId
      ? await Promise.all([
          prisma.orthodonticCase.count({
            where: { doctorId, status: { in: ["NOT_STARTED", "IN_PROGRESS"] } },
          }),
          prisma.surgeryCase.count({
            where: { doctorId, surgeryDate: { gte: start, lte: end } },
          }),
          prisma.referral.count({
            where: { toDoctorId: doctorId, status: "PENDING" },
          }),
        ])
      : [0, 0, 0];

  const nav = type === "GENERAL" ? navDoctorGeneralAr : navDoctorSpecialistAr;
  const base = type === "GENERAL" ? "/doctor/general" : "/doctor/specialist";

  return (
    <DashboardShell items={nav as never} userName={user.fullName}>
      <TopHeader
        title={`مرحبًا، ${user.fullName}`}
        subtitle={
          type === "SPECIALIST"
            ? "لوحة الأخصائي — تقويم · جراحة · حالات متعددة"
            : "لوحة الطبيب العام — استعجالي · علاج روتيني"
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="مرضى اليوم" value={stats.appointmentsToday} icon={<Users className="h-5 w-5" />} />
        <StatCard title="استعجالي" value={stats.emergencies} icon={<AlertTriangle className="h-5 w-5" />} tone="danger" />
        <StatCard title="بالانتظار" value={stats.waitingRoom} icon={<CalendarCheck2 className="h-5 w-5" />} tone="teal" />
        <StatCard
          title="مكتمل"
          value={appointments.filter((a) => a.status === "COMPLETED").length}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
        />
        {type === "SPECIALIST" && (
          <>
            <StatCard title="مرضى التقويم" value={specialistExtras[0]} icon={<Activity className="h-5 w-5" />} tone="teal" />
            <StatCard title="عمليات اليوم" value={specialistExtras[1]} icon={<Activity className="h-5 w-5" />} tone="warning" />
            <StatCard title="تحويلات معلّقة" value={specialistExtras[2]} icon={<Users className="h-5 w-5" />} tone="navy" />
            <StatCard title="لم يحضر" value={stats.noShows} icon={<UserX className="h-5 w-5" />} tone="danger" />
          </>
        )}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-bold text-navy">مواعيد اليوم</h2>
          {appointments.length === 0 ? (
            <EmptyState title="لا مواعيد اليوم" />
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <Link
                  key={apt.id}
                  href={`${base}/patients/${apt.patientId}`}
                  className="flex items-center justify-between rounded-2xl border border-border p-3 hover:bg-background"
                >
                  <div>
                    <p className="font-semibold">{apt.patient.fullName}</p>
                    <p className="text-xs text-muted">{appointmentTypeAr[apt.appointmentType]}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-latin text-sm">{formatTime(apt.startAt)}</p>
                    <StatusBadge label={appointmentStatusAr[apt.status]} tone="blue" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-bold text-navy">قاعة الانتظار</h2>
          {waiting.length === 0 ? (
            <EmptyState title="لا مرضى بالانتظار" />
          ) : (
            <div className="space-y-3">
              {waiting.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-border p-3">
                  <p className="font-semibold">{entry.patient.fullName}</p>
                  <p className="font-latin text-xs text-muted">وصول: {formatTime(entry.arrivedAt)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
