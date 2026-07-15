import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { navDoctorSpecialistAr } from "@/i18n/ar";
import { WorkingHoursEditor } from "@/components/forms/WorkingHoursEditor";

export const dynamic = "force-dynamic";

export default async function HoursSettingsPage() {
  const user = await requireUser(["ADMIN", "DOCTOR_SPECIALIST"]);
  const doctors = await prisma.doctor.findMany({
    where: { isActive: true, user: { deletedAt: null, status: "ACTIVE" } },
    include: {
      user: true,
      workingHours: { orderBy: [{ dayOfWeek: "asc" }, { shift: "asc" }] },
    },
    orderBy: { type: "asc" },
  });

  // طبيب واحد لكل اسم (تفادي تكرار منانة)
  const seen = new Set<string>();
  const uniqueDoctors = doctors.filter((doc) => {
    const key = doc.user.fullName
      .replace(/الدكتور|د\.|دكتور/gi, "")
      .replace(/\s+/g, "")
      .toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <DashboardShell items={navDoctorSpecialistAr as never} userName={user.fullName}>
      <TopHeader
        title="مواعيد العمل"
        subtitle="لكل طبيب: أيام مخصّصة · دوام صباحي ودوام مسائي منفصلان"
      />
      <div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-2">
        {uniqueDoctors.map((doc) => (
          <Card key={doc.id}>
            <WorkingHoursEditor
              csrfToken={user.csrfToken}
              doctorId={doc.id}
              doctorName={doc.user.fullName}
              initialHours={doc.workingHours.map((h) => ({
                dayOfWeek: h.dayOfWeek,
                shift: h.shift,
                startTime: h.startTime,
                endTime: h.endTime,
                isActive: h.isActive,
              }))}
            />
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
