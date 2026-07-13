import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { navDoctorSpecialistAr } from "@/i18n/ar";
import { DoctorDisplayForm } from "@/components/forms/DoctorDisplayForm";

export const dynamic = "force-dynamic";

export default async function DoctorsDisplaySettingsPage() {
  const user = await requireUser(["ADMIN", "DOCTOR_SPECIALIST"]);
  const doctors = await prisma.doctor.findMany({
    where: { isActive: true },
    include: { user: true },
    orderBy: { type: "asc" },
  });

  return (
    <DashboardShell items={navDoctorSpecialistAr as never} userName={user.fullName}>
      <TopHeader
        title="عرض الأطباء"
        subtitle="التخصص والنبذة الظاهرة في العيادة"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {doctors.map((doc) => (
          <Card key={doc.id}>
            <DoctorDisplayForm
              csrfToken={user.csrfToken}
              doctorId={doc.id}
              name={doc.user.fullName}
              specialtyAr={doc.specialtyAr}
              bioAr={doc.bioAr || ""}
            />
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
