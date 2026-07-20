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
        actions={
          dueToday.length > 0 ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
              </span>
              راتب مستحق ({toLatinDigits(dueToday.length)})
            </span>
          ) : undefined
        }
      />

      {dueToday.length > 0 && (
        <div
          role="alert"
          className="mb-5 space-y-2 rounded-2xl border-2 border-red-500 bg-red-50 px-4 py-3 text-sm leading-7 text-red-950"
        >
          <p className="flex items-center gap-2 font-bold text-red-700">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs text-white">
              !
            </span>
            إشعار: اليوم موعد دفع راتب السكرتارية
          </p>
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
              {secretaries.map((sec) => {
                const due = isSalaryDayDue(sec.salaryDayOfMonth);
                return (
                  <div
                    key={sec.id}
                    className={
                      due
                        ? "rounded-2xl ring-2 ring-red-500 ring-offset-2"
                        : undefined
                    }
                  >
                    <SecretaryHoursBar
                      userId={sec.userId}
                      name={sec.user.fullName}
                      email={sec.user.email || ""}
                      phone={sec.user.phone || ""}
                      shiftCode={sec.shiftCode}
                      workStartTime={sec.workStartTime}
                      workEndTime={sec.workEndTime}
                      workDays={sec.workDays}
                      salaryDayOfMonth={sec.salaryDayOfMonth}
                      salaryDueToday={due}
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
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
