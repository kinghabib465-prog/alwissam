import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, StatusBadge } from "@/components/ui/Card";
import {
  appointmentStatusAr,
  appointmentTypeAr,
  dayOfWeekAr,
  navSecretaryAr,
} from "@/i18n/ar";
import { AppointmentActions } from "@/components/forms/AppointmentActions";
import { formatArabicDate } from "@/lib/utils";
import { dailyQueueFromRequestNumber } from "@/lib/daily-queue";

export const dynamic = "force-dynamic";

export default async function AppointmentRequestDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser(["SECRETARY", "ADMIN"]);
  const { id } = await params;

  const request = await prisma.appointmentRequest.findUnique({
    where: { id },
    include: {
      preferredDoctor: { include: { user: true } },
      assignedDoctor: { include: { user: true } },
      statusHistory: {
        include: { changedBy: true },
        orderBy: { createdAt: "desc" },
      },
      patient: true,
    },
  });
  if (!request) notFound();

  const doctors = await prisma.doctor.findMany({
    where: { isActive: true },
    include: { user: true, workingHours: { where: { isActive: true } } },
  });

  const queue =
    dailyQueueFromRequestNumber(request.requestNumber) ||
    "—";

  return (
    <DashboardShell items={navSecretaryAr as never} userName={user.fullName}>
      <TopHeader
        title={queue === "—" ? "طلب تسجيل" : `ترتيب اليوم ${queue}`}
        subtitle={request.fullName}
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="space-y-3 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={appointmentStatusAr[request.status]} tone="warning" />
            {request.isEmergency && <StatusBadge label="استعجالي" tone="danger" />}
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">الاسم</dt>
              <dd className="font-bold text-navy">
                {request.fullName.trim().split(/\s+/)[0] || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">اللقب</dt>
              <dd className="font-semibold text-teal">
                {request.fullName.trim().split(/\s+/).slice(1).join(" ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">الهاتف</dt>
              <dd className="font-latin" data-numeric="true">
                {request.phone && request.phone !== "غير محدد"
                  ? request.phone
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">العمر</dt>
              <dd className="font-latin">{request.age ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">الخدمة</dt>
              <dd>{appointmentTypeAr[request.appointmentType]}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">المدينة</dt>
              <dd>{request.city || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted">السبب</dt>
              <dd>{request.reason}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted">ملاحظات المريض</dt>
              <dd>{request.additionalNotes || "—"}</dd>
            </div>
          </dl>

          <AppointmentActions
            requestId={request.id}
            doctors={doctors.map((d) => ({
              id: d.id,
              name: d.user.fullName,
              type: d.type,
            }))}
            csrfToken={user.csrfToken}
          />
        </Card>

        <div className="space-y-5">
          <Card>
            <h3 className="font-bold text-navy">الأطباء والجداول</h3>
            <div className="mt-3 space-y-3">
              {doctors.map((doctor) => (
                <div key={doctor.id} className="rounded-2xl border border-border p-3">
                  <p className="font-semibold">{doctor.user.fullName}</p>
                  <p className="text-xs text-muted">{doctor.specialtyAr}</p>
                  <ul className="mt-2 space-y-1 text-xs text-muted">
                    {doctor.workingHours.map((wh) => (
                      <li key={wh.id} className="font-latin">
                        {dayOfWeekAr[wh.dayOfWeek]}: {wh.startTime}–{wh.endTime}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-navy">سجل الحالة</h3>
            <div className="mt-3 space-y-3">
              {request.statusHistory.map((item) => (
                <div key={item.id} className="border-r-2 border-teal pr-3 text-sm">
                  <p className="font-medium">{appointmentStatusAr[item.newStatus]}</p>
                  <p className="text-xs text-muted">
                    {item.changedBy?.fullName || "النظام"} — {formatArabicDate(item.createdAt)}
                  </p>
                  {item.reason && <p className="mt-1 text-xs">{item.reason}</p>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
