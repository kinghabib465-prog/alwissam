import { Suspense } from "react";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { appointmentTypeAr, navSecretaryAr } from "@/i18n/ar";
import { formatAppointmentReasonLabel } from "@/lib/appointment-notes";
import { SecretaryAutoRefresh } from "@/components/secretary/SecretaryAutoRefresh";
import {
  SecretaryReceptionHub,
  type ReceptionTab,
} from "@/components/secretary/SecretaryReceptionHub";
import { SecretaryWorkflowGuide } from "@/components/secretary/SecretaryWorkflowGuide";
import { algiersDayBounds, dailyQueueFromRequestNumber } from "@/lib/daily-queue";
import {
  algiersWeekday,
  listSecretaryTodayPendingCheckIns,
} from "@/lib/secretary-today";
import { formatClinicDate } from "@/lib/clinic-date";
import { CLINIC_SHIFT_HOURS } from "@/lib/clinic-shifts";
import { periodFromStartAt } from "@/lib/doctor-availability";
import {
  buildSecretaryDoctorOptions,
  loadSecretaryDoctorsForDay,
} from "@/lib/resolve-clinic-doctors";
import {
  loadSecretaryDirectedWindows,
  loadSecretaryOpenPayments,
  loadSecretaryRejectedToday,
} from "@/lib/secretary-reception-data";

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
    appointmentTypeLabel: formatAppointmentReasonLabel(
      apt.appointmentType,
      apt.notes,
    ),
    period:
      period === "EVENING"
        ? ("EVENING" as const)
        : period === "DAY"
          ? ("DAY" as const)
          : ("MORNING" as const),
  };
}

export default async function SecretaryDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; invoice?: string }>;
}) {
  const user = await requireUser(["SECRETARY", "ADMIN"]);
  const sp = (await searchParams) || {};
  const tabRaw = sp.tab || (sp.invoice ? "pay" : undefined);
  const initialTab = (
    ["today", "intake", "waiting", "pay", "rejected"].includes(String(tabRaw))
      ? tabRaw
      : undefined
  ) as ReceptionTab | undefined;

  const { start, end } = algiersDayBounds();
  const today = algiersWeekday();

  // أي طلب استقبال غير موجّه من أيام سابقة يُغلق — التسجيل يومي فقط
  await prisma.appointmentRequest.updateMany({
    where: {
      appointmentId: null,
      createdAt: { lt: start },
      status: {
        in: ["NEW_REQUEST", "EMERGENCY", "UNDER_SECRETARY_REVIEW"],
      },
    },
    data: {
      status: "CANCELLED_BY_CLINIC",
      secretaryNotes: "أُغلق تلقائياً — انتهى يوم التسجيل",
    },
  });

  const [waiting, todayPending, doctors, directed, payments, rejected] =
    await Promise.all([
      prisma.appointmentRequest.findMany({
        where: {
          appointmentId: null,
          status: {
            in: ["NEW_REQUEST", "EMERGENCY", "UNDER_SECRETARY_REVIEW"],
          },
          createdAt: { gte: start, lt: end },
        },
        orderBy: { createdAt: "asc" },
        take: 100,
      }),
      listSecretaryTodayPendingCheckIns(),
      loadSecretaryDoctorsForDay(today),
      loadSecretaryDirectedWindows(),
      loadSecretaryOpenPayments(),
      loadSecretaryRejectedToday(),
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
      <SecretaryAutoRefresh seconds={8} />
      <TopHeader
        title="الاستقبال"
        subtitle={`${todayLabel} · صباح ${morning.start}–${morning.end} · مساء ${evening.start}–${evening.end}`}
      />
      <SecretaryWorkflowGuide />
      <Suspense fallback={null}>
        <SecretaryReceptionHub
          todayLabel={todayLabel}
          clinicShift={todayPending.clinicShift}
          morning={todayPending.morning.map(mapApt)}
          evening={todayPending.evening.map(mapApt)}
          intakeRequests={waiting.map((req) => {
            const fromNumber = dailyQueueFromRequestNumber(req.requestNumber);
            return {
              id: req.id,
              fullName: req.fullName,
              phone: req.phone,
              age: req.age,
              city: req.city,
              chronicIllnesses: req.chronicIllnesses,
              isPreviousPatient: req.isPreviousPatient,
              appointmentType: req.appointmentType,
              reason: req.reason,
              requestNumber: req.requestNumber,
              queueNumber: fromNumber ? Number(fromNumber) : null,
            };
          })}
          windows={directed.windows}
          openInvoices={payments.openInvoices}
          recentPayments={payments.recentPayments}
          rejectedEntries={rejected}
          doctors={doctorOpts}
          csrfToken={user.csrfToken}
          initialTab={initialTab}
        />
      </Suspense>
    </DashboardShell>
  );
}
