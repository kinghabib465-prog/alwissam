import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { navDoctorGeneralAr } from "@/i18n/ar";
import { DoctorPatientsList } from "@/components/doctor/DoctorPatientsList";
import { loadDoctorPatients } from "@/lib/doctor-patients";

export const dynamic = "force-dynamic";

export default async function GeneralPatientsPage() {
  const user = await requireUser(["DOCTOR_GENERAL"]);
  const doctor = await prisma.doctor.findFirst({
    where: { userId: user.id, isActive: true },
  });
  const since = doctor?.createdAt || user.createdAt || new Date(0);
  const patients = doctor ? await loadDoctorPatients(doctor.id, since) : [];

  return (
    <DashboardShell items={navDoctorGeneralAr as never} userName={user.fullName}>
      <TopHeader
        title="مرضاي"
        subtitle="بحث وتصفية — من عاينتهم منذ فتح حسابك"
      />
      <Card>
        {patients.length === 0 ? (
          <EmptyState title="لا مرضى بعد المعاينة" />
        ) : (
          <DoctorPatientsList
            patients={patients}
            csrfToken={user.csrfToken}
          />
        )}
      </Card>
    </DashboardShell>
  );
}
