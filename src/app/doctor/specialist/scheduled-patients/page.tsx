import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { navDoctorSpecialistAr } from "@/i18n/ar";
import { loadScheduledPatientsWithVisits } from "@/lib/scheduled-patients";
import { ScheduledPatientsBoard } from "@/components/doctor/ScheduledPatientsBoard";

export const dynamic = "force-dynamic";

export default async function ScheduledPatientsPage() {
  const user = await requireUser(["DOCTOR_SPECIALIST", "ADMIN"]);
  const doctor = await prisma.doctor.findFirst({
    where: { userId: user.id, isActive: true },
  });
  const groups = doctor
    ? await loadScheduledPatientsWithVisits(doctor.id)
    : [];

  return (
    <DashboardShell items={navDoctorSpecialistAr as never} userName={user.fullName}>
      <TopHeader
        title="المرضى الذين لديهم موعد"
        subtitle="تفاصيل الجلسات وما تم عمله والموعد القادم — كما سجّلتها بعد المعاينة"
      />
      <ScheduledPatientsBoard groups={groups} />
    </DashboardShell>
  );
}
