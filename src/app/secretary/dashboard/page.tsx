import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { appointmentTypeAr, navSecretaryAr } from "@/i18n/ar";
import { SecretaryRequestBar } from "@/components/secretary/SecretaryRequestBar";
import { SecretaryAutoRefresh } from "@/components/secretary/SecretaryAutoRefresh";
import { SecretaryWalkInForm } from "@/components/secretary/SecretaryWalkInForm";
import { SecretaryWorkflowGuide } from "@/components/secretary/SecretaryWorkflowGuide";
import { SecretaryTodayAppointmentsDrop } from "@/components/secretary/SecretaryTodayAppointmentsDrop";
import { algiersDayBounds } from "@/lib/daily-queue";
import {
  algiersWeekday,
  listSecretaryTodayPendingCheckIns,
} from "@/lib/secretary-today";
import { formatClinicDate } from "@/lib/clinic-date";
import { toLatinDigits } from "@/lib/latin-digits";
import { CLINIC_SHIFT_HOURS } from "@/lib/clinic-shifts";
import { periodFromStartAt } from "@/lib/doctor-availability";
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

export default async function SecretaryDashboardPage() {
  const user = await requireUser(["SECRETARY", "ADMIN"]);
  const { start, end } = algiersDayBounds();
  const today = algiersWeekday();

  const [waiting, todayPending, doctors] = await Promise.all([
    prisma.appointmentRequest.findMany({
      where: {
        status: { in: ["NEW_REQUEST", "EMERGENCY", "UNDER_SECRETARY_REVIEW"] },
        createdAt: { gte: start, lt: end },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
    listSecretaryTodayPendingCheckIns(),
    loadSecretaryDoctorsForDay(today),
  ]);

  const preferIds = [
    ...todayPending.morning.map((a) => a.doctorId),
    ...todayPending.evening.map((a) => a.doctorId),
  ];
  const doctorOpts = buildSecretaryDoctorOptions(doctors, preferIds).filter(
    (d) => doctors.find((x) => x.id === d.id)?.isActive !== false,
  );

  const todayLabel = formatClinicDate(start);
  const morning = CLINIC_SHIFT_HOURS.MORNING;
  const evening = CLINIC_SHIFT_HOURS.EVENING;

  return (
    <DashboardShell items={navSecretaryAr as never} userName={user.fullName}>
      <SecretaryAutoRefresh seconds={5} />
      <TopHeader
        title={`استقبال — ${user.fullName}`}
        subtitle={`${todayLabel} · صباح ${morning.start}–${morning.end} · مساء ${evening.start}–${evening.end}`}
      />

      <SecretaryWorkflowGuide />

      <SecretaryTodayAppointmentsDrop
        todayLabel={todayLabel}
        clinicShift={todayPending.clinicShift}
        morning={todayPending.morning.map(mapApt)}
        evening={todayPending.evening.map(mapApt)}
        doctors={doctorOpts}
        csrfToken={user.csrfToken}
        defaultOpen
      />

      <section className="mb-5">
        <p className="mb-2 text-sm font-bold text-navy">
          <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy text-xs text-white">
            2
          </span>
          تسجيل مريض عند المدخل
        </p>
        <SecretaryWalkInForm csrfToken={user.csrfToken} />
        <Card>
          {waiting.length === 0 ? (
            <EmptyState
              title="لا تسجيلات جديدة عند المدخل"
              description="من الموقع أو زر التسجيل أعلاه — أكملي البيانات ثم وجّهي للطبيب."
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-bold text-navy">
                بانتظار التوجيه: {toLatinDigits(waiting.length)}
              </p>
              {waiting.map((req, index) => (
                <SecretaryRequestBar
                  key={req.id}
                  requestId={req.id}
                  fullName={req.fullName}
                  phone={req.phone}
                  age={req.age}
                  city={req.city}
                  chronicIllnesses={req.chronicIllnesses}
                  isPreviousPatient={req.isPreviousPatient}
                  appointmentType={req.appointmentType}
                  reason={req.reason}
                  queueOrder={index + 1}
                  doctors={doctorOpts}
                  csrfToken={user.csrfToken}
                />
              ))}
            </div>
          )}
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/secretary/directed"
          className="rounded-2xl border border-border bg-white px-4 py-3 font-bold text-navy shadow-sm transition hover:border-teal/40"
        >
          <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-soft-teal text-xs text-teal">
            3
          </span>
          الموجهون — من دخلوا الانتظار
        </Link>
        <Link
          href="/secretary/payments"
          className="rounded-2xl border border-border bg-white px-4 py-3 font-bold text-navy shadow-sm transition hover:border-teal/40"
        >
          <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-soft-teal text-xs text-teal">
            4
          </span>
          الدفع بعد المعاينة
        </Link>
      </section>
    </DashboardShell>
  );
}
