import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState, StatusBadge } from "@/components/ui/Card";
import { DentalChartView } from "@/components/medical/DentalChartView";
import { navSecretaryAr, toothStateAr } from "@/i18n/ar";
import { formatCurrencyDZD } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PatientRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser([
    "SECRETARY",
    "ADMIN",
    "DOCTOR_GENERAL",
    "DOCTOR_SPECIALIST",
  ]);
  const { id } = await params;

  const patient = await prisma.patient.findFirst({
    where: { id, deletedAt: null },
    include: {
      dentalChart: { include: { teeth: true } },
      treatmentPlans: { orderBy: { createdAt: "desc" }, take: 10 },
      appointments: {
        orderBy: { startAt: "desc" },
        take: 10,
        include: { doctor: { include: { user: true } } },
      },
      invoices: { orderBy: { createdAt: "desc" }, take: 10 },
      medicalHistory: true,
      diagnoses: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!patient) notFound();

  const nav =
    user.role.code === "SECRETARY" || user.role.code === "ADMIN"
      ? navSecretaryAr
      : navSecretaryAr;

  return (
    <DashboardShell items={nav as never} userName={user.fullName}>
      <TopHeader
        title={patient.fullName}
        subtitle={`رقم المريض: ${patient.patientNumber}`}
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="space-y-2 lg:col-span-1">
          <h2 className="font-bold text-navy">البيانات</h2>
          <p className="font-latin text-sm">{patient.phone}</p>
          <p className="text-sm">{patient.email || "—"}</p>
          <p className="text-sm">العمر: <span className="font-latin">{patient.age ?? "—"}</span></p>
          <p className="text-sm">المدينة: {patient.city || "—"}</p>
          <p className="text-sm">النوع: {patient.patientType === "LONG_TERM" ? "طويل الأمد" : "عادي"}</p>
          {patient.allergies && (
            <StatusBadge label={`حساسية: ${patient.allergies}`} tone="danger" />
          )}
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-bold text-navy">مخطط الأسنان</h2>
          <DentalChartView
            patientId={patient.id}
            teeth={patient.dentalChart?.teeth || []}
            canEdit={["DOCTOR_GENERAL", "DOCTOR_SPECIALIST", "ADMIN"].includes(user.role.code)}
            csrfToken={user.csrfToken}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(toothStateAr).map(([key, label]) => (
              <StatusBadge key={key} label={label} tone="muted" />
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold text-navy">خطط العلاج</h2>
          {patient.treatmentPlans.length === 0 ? (
            <EmptyState title="لا توجد خطط علاج" />
          ) : (
            <div className="space-y-2">
              {patient.treatmentPlans.map((plan) => (
                <div key={plan.id} className="rounded-2xl border border-border p-3 text-sm">
                  <p className="font-semibold">{plan.title}</p>
                  <p className="font-latin text-muted">{formatCurrencyDZD(Number(plan.totalCost))}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-bold text-navy">المواعيد</h2>
          {patient.appointments.length === 0 ? (
            <EmptyState title="لا توجد مواعيد" />
          ) : (
            <div className="space-y-2">
              {patient.appointments.map((apt) => (
                <div key={apt.id} className="rounded-2xl border border-border p-3 text-sm">
                  <p className="font-semibold">{apt.doctor.user.fullName}</p>
                  <p className="font-latin text-muted">{apt.startAt.toISOString()}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
