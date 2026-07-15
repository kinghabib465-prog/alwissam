import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { navDoctorSpecialistAr } from "@/i18n/ar";
import { CreateDoctorForm } from "@/components/forms/CreateDoctorForm";
import { DoctorStaffBar } from "@/components/forms/DoctorStaffBar";

export const dynamic = "force-dynamic";

export default async function SpecialistDoctorsPage() {
  const user = await requireUser(["ADMIN", "DOCTOR_SPECIALIST"]);
  const doctors = await prisma.doctor.findMany({
    where: {
      isActive: true,
      user: { deletedAt: null, status: "ACTIVE" },
    },
    include: {
      user: { include: { role: true } },
      workingHours: { orderBy: [{ dayOfWeek: "asc" }, { shift: "asc" }] },
    },
    orderBy: { createdAt: "asc" },
  });

  // حساب واحد لصاحبة العيادة — إخفاء أي تكرار بالاسم
  const seenOwner = new Set<string>();
  const uniqueDoctors = doctors.filter((doc) => {
    const key = doc.user.fullName
      .replace(/الدكتور|د\.|دكتور/gi, "")
      .replace(/\s+/g, "")
      .toLowerCase();
    if (seenOwner.has(key)) return false;
    seenOwner.add(key);
    return true;
  });

  return (
    <DashboardShell items={navDoctorSpecialistAr as never} userName={user.fullName}>
      <TopHeader
        title="إدارة الأطباء"
        subtitle="اضغط الاسم للمعلومات · أوقات العمل · تعديل الدخول"
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold text-navy">إضافة طبيب</h2>
          <CreateDoctorForm csrfToken={user.csrfToken} />
        </Card>
        <Card>
          <h2 className="mb-3 font-bold text-navy">الحسابات الحالية</h2>
          {uniqueDoctors.length === 0 ? (
            <EmptyState title="لا يوجد أطباء" />
          ) : (
            <div className="space-y-3">
              {uniqueDoctors.map((doc) => {
                const isOwner = doc.user.role.code === "ADMIN";
                const canDelete =
                  doc.user.status === "ACTIVE" &&
                  !isOwner &&
                  doc.userId !== user.id;
                const shifts = [...new Set(doc.workingHours.map((h) => h.shift))];
                const defaultShift =
                  shifts[0] || (doc.type === "SPECIALIST" ? "MORNING" : "DAY");
                const primary = doc.workingHours.filter(
                  (h) => h.shift === defaultShift,
                );
                return (
                  <DoctorStaffBar
                    key={doc.id}
                    userId={doc.userId}
                    doctorId={doc.id}
                    name={doc.user.fullName}
                    email={doc.user.email || ""}
                    phone={doc.user.phone || ""}
                    specialtyAr={doc.specialtyAr}
                    type={doc.type}
                    status={doc.user.status}
                    isOwner={isOwner}
                    canDelete={canDelete}
                    csrfToken={user.csrfToken}
                    defaultShift={defaultShift}
                    initialHours={primary.map((h) => ({
                      dayOfWeek: h.dayOfWeek,
                      shift: h.shift,
                      startTime: h.startTime,
                      endTime: h.endTime,
                      isActive: h.isActive,
                    }))}
                  />
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
