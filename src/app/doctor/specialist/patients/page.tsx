import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { EmptyState } from "@/components/ui/Card";
import { navDoctorSpecialistAr } from "@/i18n/ar";
import { DoctorPatientsList } from "@/components/doctor/DoctorPatientsList";
import { ClinicWorkflowGuide } from "@/components/doctor/ClinicWorkflowGuide";
import { loadDoctorPatients } from "@/lib/doctor-patients";
import { loadDoctorAvailability } from "@/lib/doctor-availability.server";

export const dynamic = "force-dynamic";

export default async function SpecialistPatientsPage() {
  const user = await requireUser(["DOCTOR_SPECIALIST", "ADMIN"]);
  const doctor = await prisma.doctor.findFirst({
    where: { userId: user.id, isActive: true },
  });
  const general = await prisma.doctor.findFirst({
    where: { type: "GENERAL", isActive: true },
    orderBy: { createdAt: "asc" },
  });
  const since = doctor?.createdAt || user.createdAt || new Date(0);
  const patients = doctor ? await loadDoctorPatients(doctor.id, since) : [];
  const availability = doctor ? await loadDoctorAvailability(doctor.id) : null;
  const generalAvailability = general
    ? await loadDoctorAvailability(general.id)
    : null;

  return (
    <DashboardShell items={navDoctorSpecialistAr as never} userName={user.fullName}>
      <TopHeader
        title="مرضاي"
        subtitle="ملف المرضى — حجز · حساب · بيانات (ليس طابور اليوم)"
      />
      <ClinicWorkflowGuide variant="patients" />
      <div className="card-surface p-4 sm:p-5">
        {patients.length === 0 ? (
          <EmptyState title="لا مرضى بعد المعاينة" />
        ) : (
          <DoctorPatientsList
            patients={patients}
            csrfToken={user.csrfToken}
            canManage
            availability={availability}
            generalAvailability={generalAvailability}
          />
        )}
      </div>
    </DashboardShell>
  );
}
