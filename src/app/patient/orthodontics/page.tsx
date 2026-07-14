import { requirePatientUser } from "@/lib/auth/current-user";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { navPatientAr } from "@/i18n/ar";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requirePatientUser();
  return (
    <DashboardShell items={navPatientAr as never} userName={user.fullName}>
      <TopHeader title="orthodontics" subtitle="معلوماتك الشخصية فقط" />
      <Card>
        <EmptyState title="لا توجد بيانات بعد" description="ستظهر هنا السجلات المرتبطة بحسابك." />
      </Card>
    </DashboardShell>
  );
}
