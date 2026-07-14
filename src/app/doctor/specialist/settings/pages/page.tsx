import { requireUser } from "@/lib/auth/current-user";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { navDoctorSpecialistAr } from "@/i18n/ar";
import { PublicPagesContentForm } from "@/components/forms/PublicPagesContentForm";
import {
  DEFAULT_PUBLIC_PAGES,
  loadPublicPagesContent,
} from "@/lib/public-pages";

export const dynamic = "force-dynamic";

export default async function PagesSettingsPage() {
  const user = await requireUser(["ADMIN", "DOCTOR_SPECIALIST"]);
  const publicPages = await loadPublicPagesContent();

  return (
    <DashboardShell items={navDoctorSpecialistAr as never} userName={user.fullName}>
      <TopHeader
        title="صفحات الموقع"
        subtitle="من نحن · الخدمات · الأسئلة الشائعة"
      />
      <Card>
        <PublicPagesContentForm
          csrfToken={user.csrfToken}
          initialAbout={publicPages.aboutAr || DEFAULT_PUBLIC_PAGES.aboutAr}
          initialServices={publicPages.services}
          initialFaqs={publicPages.faqs}
        />
      </Card>
    </DashboardShell>
  );
}
