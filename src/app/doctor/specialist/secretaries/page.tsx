import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { navDoctorSpecialistAr } from "@/i18n/ar";
import { CreateSecretaryForm } from "@/components/forms/CreateSecretaryForm";
import { DeleteSecretaryButton } from "@/components/forms/DeleteSecretaryButton";
import { SecretaryHoursBar } from "@/components/forms/SecretaryHoursBar";
import { isSalaryDayDue } from "@/lib/secretary-salary";
import { toLatinDigits } from "@/lib/latin-digits";

export const dynamic = "force-dynamic";

export default async function SpecialistSecretariesPage() {
  const user = await requireUser(["ADMIN", "DOCTOR_SPECIALIST"]);
  const secretaries = await prisma.secretaryProfile.findMany({
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const dueToday = secretaries.filter((s) =>
    isSalaryDayDue(s.salaryDayOfMonth),
  );

  return (
    <DashboardShell items={navDoctorSpecialistAr as never} userName={user.fullName}>
      <TopHeader
        title="إدارة السكرتارية"
        subtitle="تعديل الدخول · أوقات العمل · يوم راتب لكل سكرتير"
      />

      {dueToday.length > 0 && (
        <div
          role="status"
          className="mb-5 space-y-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950"
        >
          <p className="font-bold">إشعار: اليوم موعد دفع راتب السكرتارية</p>
          <ul className="list-disc pr-5">
            {dueToday.map((s) => (
              <li key={s.id}>
                {s.user.fullName} — يوم{" "}
                {toLatinDigits(s.salaryDayOfMonth || 0)} من كل شهر
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold text-navy">إضافة سكرتير</h2>
          <CreateSecretaryForm csrfToken={user.csrfToken} />
        </Card>
        <Card>
          <h2 className="mb-3 font-bold text-navy">الحسابات الحالية</h2>
          <p className="mb-3 text-xs text-muted">
            اضغط اسم السكرتير لضبط يوم الراتب الخاص به (مثل 18 أو 31).
          </p>
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
                  workDays={sec.workDays}
                  salaryDayOfMonth={sec.salaryDayOfMonth}
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
