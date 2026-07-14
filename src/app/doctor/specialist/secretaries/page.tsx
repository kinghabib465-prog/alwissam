import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { navDoctorSpecialistAr } from "@/i18n/ar";
import { CreateSecretaryForm } from "@/components/forms/CreateSecretaryForm";
import { DeleteSecretaryButton } from "@/components/forms/DeleteSecretaryButton";
import { SecretaryHoursBar } from "@/components/forms/SecretaryHoursBar";

export const dynamic = "force-dynamic";

export default async function SpecialistSecretariesPage() {
  const user = await requireUser(["ADMIN", "DOCTOR_SPECIALIST"]);
  const secretaries = await prisma.secretaryProfile.findMany({
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <DashboardShell items={navDoctorSpecialistAr as never} userName={user.fullName}>
      <TopHeader
        title="إدارة السكرتارية"
        subtitle="تعديل الدخول · أوقات فتح الحساب (صباحي / مسائي)"
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold text-navy">إضافة سكرتير</h2>
          <CreateSecretaryForm csrfToken={user.csrfToken} />
        </Card>
        <Card>
          <h2 className="mb-3 font-bold text-navy">الحسابات الحالية</h2>
          {secretaries.length === 0 ? (
            <EmptyState title="لا يوجد سكرتارية" />
          ) : (
            <div className="space-y-3">
              {secretaries.map((sec) => (
                <SecretaryHoursBar
                  key={sec.id}
                  userId={sec.userId}
                  name={sec.user.fullName}
                  email={sec.user.email || ""}
                  phone={sec.user.phone || ""}
                  shiftCode={sec.shiftCode}
                  workStartTime={sec.workStartTime}
                  workEndTime={sec.workEndTime}
                  csrfToken={user.csrfToken}
                  status={sec.user.status}
                  onDelete={
                    sec.user.status !== "INACTIVE" ? (
                      <DeleteSecretaryButton
                        userId={sec.userId}
                        name={sec.user.fullName}
                        csrfToken={user.csrfToken}
                      />
                    ) : undefined
                  }
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
