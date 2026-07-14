import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { StatusBadge } from "@/components/ui/Card";
import { navDoctorSpecialistAr } from "@/i18n/ar";
import { loadStaffWorkLog } from "@/lib/work-log";
import { WorkLogTimeline } from "@/components/admin/WorkLogTimeline";

export const dynamic = "force-dynamic";

export default async function StaffActivityPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const user = await requireUser(["ADMIN", "DOCTOR_SPECIALIST"]);
  const { userId } = await params;

  const staff = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      doctor: true,
      secretary: true,
    },
  });

  if (!staff || (!staff.doctor && !staff.secretary)) {
    notFound();
  }

  const isSecretary = !!staff.secretary;
  const backHref = isSecretary
    ? "/doctor/specialist/secretaries"
    : "/doctor/specialist/doctors";
  const roleLabel = isSecretary
    ? "سكرتير"
    : staff.doctor?.type === "SPECIALIST"
      ? "طبيب أخصائي"
      : "طبيب عام";

  const workLog = await loadStaffWorkLog({
    staffUserId: staff.id,
    doctorId: staff.doctor?.id,
    isSecretary,
    daysBack: 45,
  });

  return (
    <DashboardShell items={navDoctorSpecialistAr as never} userName={user.fullName}>
      <TopHeader
        title={`سجل عمل: ${staff.fullName}`}
        subtitle="مجمّع حسب اليوم — مرضى · وقت الاستقبال · حضور الأطباء · المدفوعات"
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href={backHref} className="text-sm text-teal hover:underline">
          ← رجوع للقائمة
        </Link>
        <StatusBadge
          label={staff.status === "ACTIVE" ? "نشط" : "غير نشط"}
          tone={staff.status === "ACTIVE" ? "success" : "muted"}
        />
        <StatusBadge label={roleLabel} tone="teal" />
        <p className="font-latin text-sm text-muted">
          {staff.email} · {staff.phone}
        </p>
      </div>

      <WorkLogTimeline data={workLog} />
    </DashboardShell>
  );
}
