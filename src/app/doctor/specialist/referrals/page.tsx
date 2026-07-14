import { requireUser } from "@/lib/auth/current-user";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { navDoctorSpecialistAr } from "@/i18n/ar";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser(["DOCTOR_SPECIALIST","ADMIN"]);
  return (
    <DashboardShell items={navDoctorSpecialistAr as never} userName={user.fullName}>
      <TopHeader title="referrals" subtitle="بيانات حية من قاعدة البيانات" />
      <Card>
        <EmptyState
          title="لا توجد عناصر للعرض حاليًا"
          description="ستظهر السجلات هنا فور إنشائها في النظام."
        />
      </Card>
    </DashboardShell>
  );
}
