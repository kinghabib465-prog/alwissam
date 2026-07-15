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
import { algiersDayBounds } from "@/lib/daily-queue";
import {
  algiersWeekday,
  listSecretaryTodayPendingCheckIns,
} from "@/lib/secretary-today";
import { formatClinicDate } from "@/lib/clinic-date";
import { toLatinDigits } from "@/lib/latin-digits";

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
          take: 1,
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

  return (
    <DashboardShell items={navSecretaryAr as never} userName={user.fullName}>
      <SecretaryAutoRefresh seconds={5} />
      <TopHeader
        title={`استقبال — ${user.fullName}`}
        subtitle={`${todayLabel} — مواعيد اليوم عند وصولها · ثم تسجيل المدخل`}
      />

      {/* مواعيد حددها الطبيب — تظهر يومها فقط */}
      <Card className="mb-4 border-teal/40">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-bold text-navy">مواعيد اليوم</p>
            <p className="text-xs text-muted">
              حددها الطبيب — تظهر هنا في يوم الموعد فقط حتى تُدخلين المريض
            </p>
          </div>
          <Link
            href="/secretary/today"
            className="text-xs font-bold text-teal hover:underline"
          >
            فتح صفحة المواعيد
          </Link>
        </div>
        {pending.length === 0 ? (
          <EmptyState
            title="لا مواعيد بانتظار الإدخال اليوم"
            description="عندما يحين يوم الموعد الذي حدده الطبيب يظهر المريض هنا."
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

      <SecretaryWalkInForm csrfToken={user.csrfToken} />

      <Card>
        {waiting.length === 0 ? (
          <EmptyState
            title="لا مرضى عند المدخل"
            description="سجّل القادم بزر أخضر أعلاه، أو راجعي مواعيد اليوم أعلاه."
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-bold text-navy">تسجيل عند المدخل</p>
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
    </DashboardShell>
  );
}
