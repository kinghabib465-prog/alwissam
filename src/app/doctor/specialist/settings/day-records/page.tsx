import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { DayRecordsCleanup } from "@/components/admin/DayRecordsCleanup";
import { WipePatientsPanel } from "@/components/admin/WipePatientsPanel";
import { navDoctorSpecialistAr } from "@/i18n/ar";

export const dynamic = "force-dynamic";

export default async function DayRecordsSettingsPage() {
  const user = await requireUser(["ADMIN", "DOCTOR_SPECIALIST"]);
  if (user.role.code !== "ADMIN") {
    redirect("/doctor/specialist/dashboard");
  }

  return (
    <DashboardShell items={navDoctorSpecialistAr as never} userName={user.fullName}>
      <TopHeader
        title="تنظيف السجلات"
        subtitle="لمنانة فقط · حذف يوم محدد أو مسح كل المرضى مع الإبقاء على حسابات الطاقم"
      />
      <div className="mx-auto grid max-w-3xl gap-5">
        <Card>
          <DayRecordsCleanup csrfToken={user.csrfToken} />
        </Card>
        <WipePatientsPanel csrfToken={user.csrfToken} />
      </div>
    </DashboardShell>
  );
}
