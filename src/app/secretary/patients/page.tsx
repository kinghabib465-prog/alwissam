import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { navSecretaryAr } from "@/i18n/ar";
import { CreatePatientForm } from "@/components/forms/CreatePatientForm";

export const dynamic = "force-dynamic";

export default async function SecretaryPatientsPage() {
  const user = await requireUser(["SECRETARY", "ADMIN"]);
  const patients = await prisma.patient.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <DashboardShell items={navSecretaryAr as never} userName={user.fullName}>
      <TopHeader title="المرضى" subtitle="سجلات المرضى الفعلية في النظام" />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-3 font-bold text-navy">تسجيل مريض</h2>
          <CreatePatientForm csrfToken={user.csrfToken} />
        </Card>
        <Card className="lg:col-span-2">
          {patients.length === 0 ? (
            <EmptyState title="لا يوجد مرضى بعد" description="أضف مريضًا أو أكّد طلب موعد لإنشاء سجل." />
          ) : (
            <div className="space-y-2">
              {patients.map((patient) => (
                <Link
                  key={patient.id}
                  href={`/patients/${patient.id}`}
                  className="flex items-center justify-between rounded-2xl border border-border p-3 hover:bg-background"
                >
                  <div>
                    <p className="font-semibold text-navy">{patient.fullName}</p>
                    <p className="font-latin text-sm text-muted">{patient.phone}</p>
                  </div>
                  <span className="font-latin text-xs text-muted">{patient.patientNumber}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
