import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { EmptyState } from "@/components/ui/Card";
import {
  appointmentStatusAr,
  appointmentTypeAr,
  navDoctorSpecialistAr,
  waitingRoomStatusAr,
} from "@/i18n/ar";
import { algiersDayBounds } from "@/lib/daily-queue";
import { formatClinicDate } from "@/lib/clinic-date";
import { ClinicWorkflowGuide } from "@/components/doctor/ClinicWorkflowGuide";
import {
  DoctorTodayBoard,
  type TodayAptView,
  type TodaySectionKey,
} from "@/components/doctor/DoctorTodayBoard";

export const dynamic = "force-dynamic";

type AptRow = Awaited<
  ReturnType<
    typeof prisma.appointment.findMany<{
      include: { patient: true; waitingRoomEntry: true };
    }>
  >
>[number];

function sectionOf(apt: AptRow): TodaySectionKey {
  const wr = apt.waitingRoomEntry;
  if (
    apt.status === "COMPLETED" ||
    wr?.status === "SESSION_DONE" ||
    wr?.status === "LEFT"
  ) {
    return "done";
  }
  if (wr?.status === "WITH_DOCTOR" || apt.status === "IN_TREATMENT") {
    return "withDoctor";
  }
  if (wr && ["WAITING", "ARRIVED"].includes(wr.status)) {
    return "waiting";
  }
  return "upcoming";
}

function toView(apt: AptRow): TodayAptView {
  const wr = apt.waitingRoomEntry;
  const statusLabel = wr
    ? waitingRoomStatusAr[wr.status as keyof typeof waitingRoomStatusAr] ||
      wr.status
    : appointmentStatusAr[apt.status] || apt.status;
  const tone: TodayAptView["tone"] =
    wr?.status === "WITH_DOCTOR"
      ? "teal"
      : wr?.status === "SESSION_DONE" || apt.status === "COMPLETED"
        ? "success"
        : wr
          ? "warning"
          : "muted";

  return {
    id: apt.id,
    patientId: apt.patientId,
    patientName: apt.patient.fullName,
    phone: apt.patient.phone || "",
    startAtIso: apt.startAt.toISOString(),
    typeLabel:
      appointmentTypeAr[apt.appointmentType] || apt.appointmentType,
    statusLabel,
    tone,
  };
}

/** لوحة اليوم — مسار المريض: لم يصل / انتظار / معاينة / انتهى */
export default async function SpecialistTodayPage() {
  const user = await requireUser(["DOCTOR_SPECIALIST", "ADMIN"]);
  const doctor = await prisma.doctor.findFirst({
    where: { userId: user.id, isActive: true },
  });
  const { start, end } = algiersDayBounds();
  const todayLabel = formatClinicDate(start);

  const appointments = doctor
    ? await prisma.appointment.findMany({
        where: {
          doctorId: doctor.id,
          deletedAt: null,
          startAt: { gte: start, lt: end },
          status: {
            notIn: [
              "CANCELLED_BY_CLINIC",
              "CANCELLED_BY_PATIENT",
              "NO_SHOW",
            ],
          },
        },
        include: {
          patient: true,
          waitingRoomEntry: true,
        },
        orderBy: { startAt: "asc" },
      })
    : [];

  const bySection: Record<TodaySectionKey, TodayAptView[]> = {
    upcoming: [],
    waiting: [],
    withDoctor: [],
    done: [],
  };
  const seenInSection: Record<TodaySectionKey, Set<string>> = {
    upcoming: new Set(),
    waiting: new Set(),
    withDoctor: new Set(),
    done: new Set(),
  };

  for (const apt of appointments) {
    const section = sectionOf(apt);
    if (seenInSection[section].has(apt.patientId)) continue;
    seenInSection[section].add(apt.patientId);
    bySection[section].push(toView(apt));
  }

  return (
    <DashboardShell items={navDoctorSpecialistAr as never} userName={user.fullName}>
      <TopHeader
        title="لوحة اليوم"
        subtitle={`${todayLabel} — من وصل ومن يُعالج ومن انتهى`}
      />

      <ClinicWorkflowGuide variant="today" />

      <div className="card-surface p-4 sm:p-5">
        {!doctor ? (
          <EmptyState title="ملف الطبيب غير موجود" />
        ) : appointments.length === 0 ? (
          <EmptyState
            title="لا مواعيد لهذا اليوم"
            description="عند حجز موعد بتاريخ اليوم يظهر هنا. لمعالجة من في الانتظار افتحي المعاينة."
          />
        ) : (
          <DoctorTodayBoard sections={bySection} />
        )}
      </div>
    </DashboardShell>
  );
}
