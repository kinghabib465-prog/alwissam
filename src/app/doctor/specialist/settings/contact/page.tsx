import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { navDoctorSpecialistAr } from "@/i18n/ar";
import { ContactSettingsForm } from "@/components/forms/ContactSettingsForm";

export const dynamic = "force-dynamic";

type ClinicInfo = {
  nameAr?: string;
  phone?: string;
  email?: string;
  address?: string;
  mapsEmbedUrl?: string;
  mapsLink?: string;
};

export default async function ContactSettingsPage() {
  const user = await requireUser(["ADMIN", "DOCTOR_SPECIALIST"]);
  const clinicRow = await prisma.clinicSetting.findUnique({
    where: { key: "clinic_info" },
  });
  const info = (clinicRow?.value || {}) as ClinicInfo;

  return (
    <DashboardShell items={navDoctorSpecialistAr as never} userName={user.fullName}>
      <TopHeader
        title="تواصل معنا"
        subtitle="نفس بيانات صفحة الموقع العامة — الهاتف · العنوان · الخريطة"
      />
      <Card>
        <ContactSettingsForm
          csrfToken={user.csrfToken}
          initial={{
            nameAr: info.nameAr || "عيادة الوسام لطب الأسنان",
            phone: info.phone || "",
            email: info.email || "",
            address: info.address || "",
            mapsEmbedUrl: info.mapsEmbedUrl || "",
            mapsLink: info.mapsLink || "",
          }}
        />
      </Card>
    </DashboardShell>
  );
}
