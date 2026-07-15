import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { navDoctorGeneralAr } from "@/i18n/ar";
import { DoctorExamPanel } from "@/components/doctor/DoctorExamPanel";

export const dynamic = "force-dynamic";

export default async function GeneralDoctorDashboardPage() {
  const user = await requireUser(["DOCTOR_GENERAL"]);
  const doctor = await prisma.doctor.findFirst({
    where: { userId: user.id, isActive: true },
  });

  const waiting = doctor
    ? await prisma.waitingRoomEntry.findMany({
        where: {
          doctorId: doctor.id,
          status: { in: ["WAITING", "WITH_DOCTOR"] },
        },
        include: {
          patient: { include: { account: true } },
          appointment: {
            include: { request: true },
          },
        },
        orderBy: { arrivedAt: "asc" },
      })
    : [];

  return (
    <DashboardShell items={navDoctorGeneralAr as never} userName={user.fullName}>
      <TopHeader
        title="المعاينة"
        subtitle="المرضى الموجَّهون من السكرتارية — اضغط الاسم للمعلومات ثم معاينة"
      />
      <Card>
        {waiting.length === 0 ? (
          <EmptyState title="لا مرضى بانتظار المعاينة" />
        ) : (
          <div className="space-y-2">
            {waiting.map((entry) => {
              const req = entry.appointment.request;
              return (
                <DoctorExamPanel
                  key={entry.id}
                  entryId={entry.id}
                  patientId={entry.patientId}
                  fullName={entry.patient.fullName}
                  phone={entry.patient.phone}
                  status={entry.status}
                  hasAccount={!!entry.patient.account}
                  canCreateAccount={false}
                  csrfToken={user.csrfToken}
                  patientInfo={{
                    phone: entry.patient.phone,
                    age: entry.patient.age ?? req?.age,
                    city: entry.patient.city || req?.city,
                    chronicIllnesses:
                      entry.patient.chronicIllnesses ||
                      req?.chronicIllnesses,
                    visitReason:
                      req?.reason ||
                      entry.appointment.notes ||
                      entry.note,
                    isFirstVisit: req ? !req.isPreviousPatient : null,
                    receptionNote: entry.note,
                  }}
                />
              );
            })}
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}
