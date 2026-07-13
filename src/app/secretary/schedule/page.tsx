import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card } from "@/components/ui/Card";
import { navSecretaryAr } from "@/i18n/ar";
import { SecretaryScheduleForm } from "@/components/secretary/SecretaryScheduleForm";
import { formatArabicDate, formatTime } from "@/lib/utils";
import { DayOfWeek } from "@prisma/client";

export const dynamic = "force-dynamic";

const DAY_MAP: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export default async function SecretarySchedulePage() {
  const user = await requireUser(["SECRETARY", "ADMIN"]);
  const today = DAY_MAP[new Date().getDay()]!;

  const [doctors, patients] = await Promise.all([
    prisma.doctor.findMany({
      where: { isActive: true },
      include: {
        user: { select: { fullName: true } },
        workingHours: {
          where: { isActive: true, dayOfWeek: today },
          take: 1,
        },
      },
      orderBy: { type: "asc" },
    }),
    prisma.patient.findMany({
      where: { deletedAt: null },
      orderBy: { fullName: "asc" },
      take: 300,
      include: {
        appointments: {
          where: {
            deletedAt: null,
            status: {
              in: [
                "CONFIRMED",
                "REMINDER_SENT",
                "DOCTOR_ASSIGNED",
                "PATIENT_ARRIVED",
              ],
            },
            startAt: { gte: new Date() },
          },
          orderBy: { startAt: "asc" },
          take: 1,
        },
      },
    }),
  ]);

  return (
    <DashboardShell items={navSecretaryAr as never} userName={user.fullName}>
      <TopHeader
        title="المواعيد"
        subtitle="تحديد الموعد حسب حضور الطبيب والدوام"
      />
      <Card>
        <SecretaryScheduleForm
          csrfToken={user.csrfToken}
          doctors={doctors.map((d) => ({
            id: d.id,
            name: d.user.fullName,
            type: d.type,
            worksToday: d.workingHours.length > 0,
            color: d.colorCode || (d.type === "SPECIALIST" ? "#1d4ed8" : "#0d9488"),
          }))}
          patients={patients.map((p) => {
            const next = p.appointments[0];
            return {
              id: p.id,
              fullName: p.fullName,
              phone: p.phone,
              nextAppointmentId: next?.id ?? null,
              nextLabel: next
                ? `${formatArabicDate(next.startAt)} · ${formatTime(next.startAt)}`
                : null,
            };
          })}
        />
      </Card>
    </DashboardShell>
  );
}
