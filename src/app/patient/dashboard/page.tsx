import { requirePatientUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { ClinicLogo } from "@/components/branding/ClinicLogo";
import { AppointmentCountdown } from "@/components/dashboard/AppointmentCountdown";
import { PatientContactBanner } from "@/components/patient/PatientContactBanner";
import { formatClinicAppointmentDay } from "@/lib/clinic-date";
import { loadClinicContact } from "@/lib/clinic-contact";
import { toLatinDigits } from "@/lib/latin-digits";

export const dynamic = "force-dynamic";

export default async function PatientDashboardPage() {
  const user = await requirePatientUser();
  const account = user.patientAccount;
  if (!account) {
    return <div className="p-8 text-center">حساب المريض غير مرتبط.</div>;
  }

  const patientId = account.patientId;
  const patientName = account.patient?.fullName || user.fullName;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [nextAppointment, sessionsCount, ortho, contact] = await Promise.all([
    prisma.appointment.findFirst({
      where: {
        patientId,
        startAt: { gte: todayStart },
        status: {
          in: ["CONFIRMED", "REMINDER_SENT", "WAITING_ROOM", "DOCTOR_ASSIGNED"],
        },
        deletedAt: null,
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.appointment.count({
      where: { patientId, status: "COMPLETED", deletedAt: null },
    }),
    prisma.orthodonticCase.findFirst({
      where: {
        patientId,
        nextAppointment: { gte: todayStart },
        status: { in: ["IN_PROGRESS", "NOT_STARTED"] },
      },
      orderBy: { nextAppointment: "asc" },
    }),
    loadClinicContact(),
  ]);

  const targetDate =
    nextAppointment?.startAt || ortho?.nextAppointment || null;
  const dayLabel = targetDate ? formatClinicAppointmentDay(targetDate) : null;

  return (
    <div className="min-h-screen bg-[#F4F8FA]">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-4">
          <ClinicLogo className="h-10 w-auto" />
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-[#EEF3F6] hover:text-navy"
            >
              خروج
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <div className="text-center">
          <p className="text-sm text-muted">مرحبًا</p>
          <h1 className="mt-1 text-2xl font-bold text-navy">{patientName}</h1>
        </div>

        {/* الجلسات */}
        <section className="rounded-2xl border border-border bg-white px-5 py-6 text-center shadow-sm">
          <p className="text-sm text-muted">عدد الجلسات التي ذهبت إليها</p>
          <p className="font-latin mt-3 text-5xl font-bold text-teal">
            {toLatinDigits(sessionsCount)}
          </p>
        </section>

        {/* الموعد */}
        <section className="rounded-2xl border border-border bg-white px-5 py-6 text-center shadow-sm">
          <p className="text-sm text-muted">تاريخ الموعد القادم</p>
          {dayLabel ? (
            <p
              className="mt-3 text-xl font-bold leading-relaxed text-navy"
              data-numeric="true"
            >
              {dayLabel}
            </p>
          ) : (
            <p className="mt-3 text-base font-semibold text-muted">
              لا يوجد موعد محدد بعد
            </p>
          )}
        </section>

        {/* عدّاد حتى يوم الموعد (ليس ساعة الطبيب) */}
        {targetDate ? (
          <AppointmentCountdown
            targetIso={targetDate.toISOString()}
            dayOnly
          />
        ) : null}

        {/* الاتصال */}
        <PatientContactBanner contact={contact} />
      </main>
    </div>
  );
}
