import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { navSecretaryAr } from "@/i18n/ar";
import { SecretaryRequestBar } from "@/components/secretary/SecretaryRequestBar";
import { SecretaryAutoRefresh } from "@/components/secretary/SecretaryAutoRefresh";
import { SecretaryWalkInForm } from "@/components/secretary/SecretaryWalkInForm";
import { algiersDayBounds } from "@/lib/daily-queue";
import { countSecretaryTodayPendingCheckIns } from "@/lib/secretary-today";
import { DayOfWeek } from "@prisma/client";
import { toLatinDigits } from "@/lib/latin-digits";

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

export default async function SecretaryDashboardPage() {
  const user = await requireUser(["SECRETARY", "ADMIN"]);
  const { start, end } = algiersDayBounds();
  const today = DAY_MAP[new Date().getDay()]!;

  const [waiting, todayApptCount, doctors] = await Promise.all([
    prisma.appointmentRequest.findMany({
      where: {
        status: { in: ["NEW_REQUEST", "EMERGENCY", "UNDER_SECRETARY_REVIEW"] },
        createdAt: { gte: start, lt: end },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
    countSecretaryTodayPendingCheckIns(),
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

  return (
    <DashboardShell items={navSecretaryAr as never} userName={user.fullName}>
      <SecretaryAutoRefresh seconds={5} />
      <TopHeader
        title={`استقبال — ${user.fullName}`}
        subtitle="طلبات التسجيل من الموقع والمدخل — عدّلي البيانات ثم وجّهي للطبيب"
      />

      {todayApptCount > 0 && (
        <Link
          href="/secretary/today"
          className="mb-4 flex items-center justify-between rounded-2xl border-2 border-teal/40 bg-soft-teal/25 px-4 py-3 font-bold text-navy hover:bg-soft-teal/40"
        >
          <span>مواعيد اليوم بانتظار الإدخال</span>
          <span className="font-latin rounded-full bg-teal px-3 py-1 text-white">
            {toLatinDigits(todayApptCount)}
          </span>
        </Link>
      )}

      <SecretaryWalkInForm csrfToken={user.csrfToken} />

      <Card>
        {waiting.length === 0 ? (
          <EmptyState
            title="لا مرضى عند المدخل"
            description="سجّل القادم بزر أخضر أعلاه، أو راجع خانة المواعيد لمواعيد اليوم."
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-bold text-navy">عند المدخل</p>
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
