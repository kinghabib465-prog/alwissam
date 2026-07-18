import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { DayRecordsCleanup } from "@/components/admin/DayRecordsCleanup";
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
        title="تنظيف سجل يوم"
        subtitle="لمنانة فقط · فحص السجلات قبل الحذف · حماية البيانات الطبية والمالية"
      />
      <div className="mx-auto max-w-3xl">
        <Card>
          <DayRecordsCleanup csrfToken={user.csrfToken} />
        </Card>
      </div>
    </DashboardShell>
  );
}
