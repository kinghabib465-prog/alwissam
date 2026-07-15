import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { appointmentTypeAr, navSecretaryAr } from "@/i18n/ar";
import { SecretaryRequestBar } from "@/components/secretary/SecretaryRequestBar";
import { SecretaryScheduledBar } from "@/components/secretary/SecretaryScheduledBar";
import { SecretaryAutoRefresh } from "@/components/secretary/SecretaryAutoRefresh";
import { SecretaryWalkInForm } from "@/components/secretary/SecretaryWalkInForm";
import { SecretaryWorkflowGuide } from "@/components/secretary/SecretaryWorkflowGuide";
import { algiersDayBounds } from "@/lib/daily-queue";
import {
  algiersWeekday,
  listSecretaryTodayPendingCheckIns,
} from "@/lib/secretary-today";
import { formatClinicDate } from "@/lib/clinic-date";
import { toLatinDigits } from "@/lib/latin-digits";
import { CLINIC_SHIFT_HOURS } from "@/lib/clinic-shifts";

export const dynamic = "force-dynamic";

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
    prisma.doctor.findMany({
      where: { isActive: true },
      include: {
        user: true,
        workingHours: {
          where: { isActive: true, dayOfWeek: today },
        },
      },
      orderBy: { type: "asc" },
    }),
  ]);

  const present = doctors.filter((d) => d.workingHours.length > 0);
  const doctorSource = present.length > 0 ? present : doctors;
  const seenNames = new Set<string>();
  const doctorOpts = doctorSource
    .map((d) => ({
      id: d.id,
      name: d.user.fullName,
      type: d.type,
    }))
    .filter((d) => {
      const key = d.name
        .replace(/الدكتور|د\.|دكتور/gi, "")
        .replace(/\s+/g, "")
        .toLowerCase();
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });

  const todayLabel = formatClinicDate(start);
  const pending = todayPending.pending;
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

      {/* 1 — مواعيد حجزها الطبيب ووصل يومها */}
      <section className="mb-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-navy">
            <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal text-xs text-white">
              1
            </span>
            مواعيد اليوم — وصل موعدهم
          </p>
          <Link
            href="/secretary/today"
            className="text-xs font-bold text-teal hover:underline"
          >
            صفحة المواعيد
          </Link>
        </div>
        <Card className="border-teal/40">
          {pending.length === 0 ? (
            <EmptyState
              title="لا مواعيد بانتظار الإدخال الآن"
              description="عندما يحين يوم الموعد الذي حدده الطبيب يظهر هنا — ثم «وصل — إدخال للطبيب»."
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-bold text-teal">
                بانتظار الإدخال: {toLatinDigits(pending.length)}
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
      </section>

      {/* 2 — تسجيل جديد / مدخل */}
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

      {/* 3 — اختصارات الخطوة التالية */}
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
