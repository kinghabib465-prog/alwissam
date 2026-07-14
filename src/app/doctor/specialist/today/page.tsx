import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { EmptyState, StatusBadge } from "@/components/ui/Card";
import {
  appointmentStatusAr,
  appointmentTypeAr,
  navDoctorSpecialistAr,
  waitingRoomStatusAr,
} from "@/i18n/ar";
import { algiersDayBounds } from "@/lib/daily-queue";
import { formatClinicDate } from "@/lib/clinic-date";
import { formatTime } from "@/lib/utils";
import { toLatinDigits } from "@/lib/latin-digits";
import { splitPatientName } from "@/lib/patient-name";

export const dynamic = "force-dynamic";

type AptRow = Awaited<
  ReturnType<
    typeof prisma.appointment.findMany<{
      include: { patient: true; waitingRoomEntry: true };
    }>
  >
>[number];

function sectionOf(apt: AptRow): "upcoming" | "waiting" | "withDoctor" | "done" {
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

function PatientRow({
  apt,
  index,
}: {
  apt: AptRow;
  index: number;
}) {
  const { firstName, lastName } = splitPatientName(apt.patient.fullName);
  const wr = apt.waitingRoomEntry;
  const statusLabel = wr
    ? waitingRoomStatusAr[wr.status as keyof typeof waitingRoomStatusAr] ||
      wr.status
    : appointmentStatusAr[apt.status] || apt.status;
  const tone: "teal" | "success" | "warning" | "muted" =
    wr?.status === "WITH_DOCTOR"
      ? "teal"
      : wr?.status === "SESSION_DONE" || apt.status === "COMPLETED"
        ? "success"
        : wr
          ? "warning"
          : "muted";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="font-latin flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-soft-teal text-lg font-bold text-teal">
          {toLatinDigits(index + 1)}
        </span>
        <div className="min-w-0">
          <p className="font-bold text-navy">
            {firstName}
            {lastName ? (
              <span className="mr-2 font-semibold text-teal">{lastName}</span>
            ) : null}
          </p>
          <p className="font-latin mt-0.5 text-sm text-muted">
            {toLatinDigits(formatTime(apt.startAt))}
            {" · "}
            {appointmentTypeAr[apt.appointmentType] || apt.appointmentType}
            {" · "}
            {toLatinDigits(apt.patient.phone || "—")}
          </p>
        </div>
      </div>
      <StatusBadge label={statusLabel} tone={tone} />
    </div>
  );
}

function Section({
  title,
  toneClass,
  items,
}: {
  title: string;
  toneClass: string;
  items: AptRow[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-5">
      <h2
        className={`mb-2 inline-flex rounded-2xl px-3 py-1.5 text-sm font-bold ${toneClass}`}
      >
        {title} ({toLatinDigits(items.length)})
      </h2>
      <div className="space-y-2">
        {items.map((apt, index) => (
          <PatientRow key={apt.id} apt={apt} index={index} />
        ))}
      </div>
    </section>
  );
}

/** مواعيد اليوم — مقسّمة: لم يصلوا / انتظار / معاينة / منتهون */
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

  // مريض واحد في كل قسم (آخر حالة ذات صلة)
  const bySection = {
    upcoming: [] as AptRow[],
    waiting: [] as AptRow[],
    withDoctor: [] as AptRow[],
    done: [] as AptRow[],
  };
  const seenInSection = {
    upcoming: new Set<string>(),
    waiting: new Set<string>(),
    withDoctor: new Set<string>(),
    done: new Set<string>(),
  };

  for (const apt of appointments) {
    const section = sectionOf(apt);
    if (seenInSection[section].has(apt.patientId)) continue;
    seenInSection[section].add(apt.patientId);
    bySection[section].push(apt);
  }

  return (
    <DashboardShell items={navDoctorSpecialistAr as never} userName={user.fullName}>
      <TopHeader
        title="مواعيد اليوم"
        subtitle={`${todayLabel} — مقسّمة حسب حالة المريض دون تكرار`}
      />

      <div className="card-surface p-4 sm:p-5">
        {!doctor ? (
          <EmptyState title="ملف الطبيب غير موجود" />
        ) : appointments.length === 0 ? (
          <EmptyState
            title="لا مواعيد لهذا اليوم"
            description="عند تحديد موعد بتاريخ اليوم يظهر هنا لتعرف من ستعالجين."
          />
        ) : (
          <>
            <Section
              title="لم يصلوا بعد"
              toneClass="bg-[#FFF7E8] text-warning"
              items={bySection.upcoming}
            />
            <Section
              title="في الانتظار"
              toneClass="bg-amber-100 text-amber-900"
              items={bySection.waiting}
            />
            <Section
              title="قيد المعاينة"
              toneClass="bg-soft-teal text-teal"
              items={bySection.withDoctor}
            />
            <Section
              title="انتهوا اليوم"
              toneClass="bg-[#E8F8F0] text-success"
              items={bySection.done}
            />
          </>
        )}
      </div>
    </DashboardShell>
  );
}
