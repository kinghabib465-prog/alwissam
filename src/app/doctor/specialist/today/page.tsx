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

/** مواعيد اليوم لمنانة — من وصل تاريخ موعده لتعرف من ستعالج */
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

  const done = appointments.filter(
    (a) =>
      a.status === "COMPLETED" ||
      a.waitingRoomEntry?.status === "SESSION_DONE" ||
      a.waitingRoomEntry?.status === "LEFT",
  ).length;
  const waiting = appointments.filter(
    (a) =>
      a.waitingRoomEntry &&
      ["WAITING", "ARRIVED"].includes(a.waitingRoomEntry.status),
  ).length;
  const withDoctor = appointments.filter(
    (a) => a.waitingRoomEntry?.status === "WITH_DOCTOR",
  ).length;
  const upcoming = appointments.filter((a) => !a.waitingRoomEntry).length;

  return (
    <DashboardShell items={navDoctorSpecialistAr as never} userName={user.fullName}>
      <TopHeader
        title="مواعيد اليوم"
        subtitle={`${todayLabel} — من سيُعالَج اليوم حسب المواعيد`}
      />

      {appointments.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-2xl bg-navy/10 px-3 py-1.5 font-semibold text-navy">
            الكل: {toLatinDigits(appointments.length)}
          </span>
          <span className="rounded-2xl bg-[#FFF7E8] px-3 py-1.5 font-semibold text-warning">
            لم يصلوا: {toLatinDigits(upcoming)}
          </span>
          <span className="rounded-2xl bg-amber-100 px-3 py-1.5 font-semibold text-amber-900">
            انتظار: {toLatinDigits(waiting)}
          </span>
          <span className="rounded-2xl bg-soft-teal px-3 py-1.5 font-semibold text-teal">
            معاينة: {toLatinDigits(withDoctor)}
          </span>
          <span className="rounded-2xl bg-[#E8F8F0] px-3 py-1.5 font-semibold text-success">
            منتهون: {toLatinDigits(done)}
          </span>
        </div>
      )}

      <div className="card-surface p-4 sm:p-5">
        {!doctor ? (
          <EmptyState title="ملف الطبيب غير موجود" />
        ) : appointments.length === 0 ? (
          <EmptyState
            title="لا مواعيد لهذا اليوم"
            description="عند تحديد موعد بتاريخ اليوم يظهر هنا لتعرف من ستعالجين."
          />
        ) : (
          <div className="space-y-2">
            {appointments.map((apt, index) => {
              const { firstName, lastName } = splitPatientName(
                apt.patient.fullName,
              );
              const wr = apt.waitingRoomEntry;
              const statusLabel = wr
                ? waitingRoomStatusAr[
                    wr.status as keyof typeof waitingRoomStatusAr
                  ] || wr.status
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
                <div
                  key={apt.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="font-latin flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-soft-teal text-lg font-bold text-teal">
                      {toLatinDigits(index + 1)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-navy">
                        {firstName}
                        {lastName ? (
                          <span className="mr-2 font-semibold text-teal">
                            {lastName}
                          </span>
                        ) : null}
                      </p>
                      <p className="font-latin mt-0.5 text-sm text-muted">
                        {toLatinDigits(formatTime(apt.startAt))}
                        {" · "}
                        {appointmentTypeAr[apt.appointmentType] ||
                          apt.appointmentType}
                        {" · "}
                        {toLatinDigits(apt.patient.phone || "—")}
                      </p>
                    </div>
                  </div>
                  <StatusBadge label={statusLabel} tone={tone} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
