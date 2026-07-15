import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { navDoctorSpecialistAr } from "@/i18n/ar";
import { WorkingHoursEditor } from "@/components/forms/WorkingHoursEditor";
import { toLatinDigits } from "@/lib/latin-digits";

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
        subtitle="جدول منظم لكل طبيب · صباحي ومسائي · ساعات بأرقام غربية 0–9"
      />
      <div className="mx-auto grid max-w-4xl gap-5">
        {uniqueDoctors.map((doc, i) => (
          <Card key={doc.id}>
            <p className="font-latin mb-2 text-xs font-bold tabular-nums text-muted">
              طبيب {toLatinDigits(i + 1)} من {toLatinDigits(uniqueDoctors.length)}
            </p>
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
