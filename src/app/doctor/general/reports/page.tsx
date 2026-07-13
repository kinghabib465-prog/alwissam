import { requireUser } from "@/lib/auth/current-user";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { navDoctorGeneralAr } from "@/i18n/ar";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser(["DOCTOR_GENERAL","ADMIN"]);
  return (
    <DashboardShell items={navDoctorGeneralAr as never} userName={user.fullName}>
      <TopHeader title="reports" subtitle="بيانات حية من قاعدة البيانات" />
      <Card>
        <EmptyState
          title="لا توجد عناصر للعرض حاليًا"
          description="ستظهر السجلات هنا فور إنشائها في النظام."
        />
      </Card>
    </DashboardShell>
  );
}
