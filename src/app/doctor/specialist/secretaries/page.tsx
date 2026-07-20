import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { navDoctorSpecialistAr } from "@/i18n/ar";
import { CreateSecretaryForm } from "@/components/forms/CreateSecretaryForm";
import { DeleteSecretaryButton } from "@/components/forms/DeleteSecretaryButton";
import { SecretaryHoursBar } from "@/components/forms/SecretaryHoursBar";
import { SecretarySalaryDayForm } from "@/components/doctor/SecretarySalaryDayForm";
import {
  isSecretarySalaryDueToday,
  loadSecretarySalarySetting,
} from "@/lib/secretary-salary";
import { isClinicOwner } from "@/lib/auth/clinic-owner";

export const dynamic = "force-dynamic";

export default async function SpecialistSecretariesPage() {
  const user = await requireUser(["ADMIN", "DOCTOR_SPECIALIST"]);
  const secretaries = await prisma.secretaryProfile.findMany({
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  const salary = await loadSecretarySalarySetting();
  const salaryDue = isSecretarySalaryDueToday(salary);
  const canEditSalary = isClinicOwner(user);

  return (
    <DashboardShell items={navDoctorSpecialistAr as never} userName={user.fullName}>
      <TopHeader
        title="إدارة السكرتارية"
        subtitle="تعديل الدخول · أوقات فتح الحساب · تذكير يوم الراتب"
      />

      {salaryDue && (
        <div
          role="status"
          className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950"
        >
          <p className="font-bold">إشعار: اليوم موعد دفع راتب السكرتارية</p>
          <p className="mt-1">
            يوم الراتب المحدد: {salary.dayOfMonth} من كل شهر
            {salary.note ? ` — ${salary.note}` : ""}
          </p>
        </div>
      )}

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
                  workDays={sec.workDays}
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
        {canEditSalary && (
          <Card className="lg:col-span-2">
            <h2 className="mb-3 font-bold text-navy">تذكير يوم راتب السكرتارية</h2>
            <SecretarySalaryDayForm csrfToken={user.csrfToken} initial={salary} />
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
