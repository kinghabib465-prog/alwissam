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
    where: { isActive: true },
    include: {
      user: true,
      workingHours: { orderBy: [{ dayOfWeek: "asc" }, { shift: "asc" }] },
    },
    orderBy: { type: "asc" },
  });

  return (
    <DashboardShell items={navDoctorSpecialistAr as never} userName={user.fullName}>
      <TopHeader title="مواعيد العمل" subtitle="أيام وساعات كل طبيب" />
      <div className="grid gap-4 lg:grid-cols-2">
        {doctors.map((doc) => {
          const shifts = [...new Set(doc.workingHours.map((h) => h.shift))];
          const defaultShift =
            shifts[0] || (doc.type === "SPECIALIST" ? "MORNING" : "DAY");
          const primary = doc.workingHours.filter(
            (h) => h.shift === defaultShift,
          );
          return (
            <Card key={doc.id}>
              <WorkingHoursEditor
                csrfToken={user.csrfToken}
                doctorId={doc.id}
                doctorName={doc.user.fullName}
                defaultShift={defaultShift}
                initialHours={primary.map((h) => ({
                  dayOfWeek: h.dayOfWeek,
                  shift: h.shift,
                  startTime: h.startTime,
                  endTime: h.endTime,
                  isActive: h.isActive,
                }))}
              />
            </Card>
          );
        })}
      </div>
    </DashboardShell>
  );
}
