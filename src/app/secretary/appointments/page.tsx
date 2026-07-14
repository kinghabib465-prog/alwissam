import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState, StatusBadge } from "@/components/ui/Card";
import { appointmentStatusAr, appointmentTypeAr, navSecretaryAr } from "@/i18n/ar";
import { formatArabicDate } from "@/lib/utils";
import { algiersDayBounds, dailyQueueFromRequestNumber } from "@/lib/daily-queue";
import { toLatinDigits } from "@/lib/latin-digits";

export const dynamic = "force-dynamic";

export default async function SecretaryAppointmentsPage() {
  await requireUser(["SECRETARY", "ADMIN"]);
  const { start, end } = algiersDayBounds();

  const requests = await prisma.appointmentRequest.findMany({
    include: {
      preferredDoctor: { include: { user: true } },
      assignedDoctor: { include: { user: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 150,
  });

  // ترتيب اليوم حسب وقت التسجيل (1، 2، 3...)
  const todayIds = requests
    .filter((r) => r.createdAt >= start && r.createdAt < end)
    .map((r) => r.id);
  const orderMap = new Map(todayIds.map((id, i) => [id, i + 1]));

  const sorted = [...requests].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return (
    <DashboardShell items={navSecretaryAr as never} userName="السكرتارية">
      <TopHeader
        title="طلبات التسجيل"
        subtitle="الترتيب لليوم أرقام 1 · 2 · 3"
      />
      <Card>
        {sorted.length === 0 ? (
          <EmptyState
            title="لا توجد طلبات بعد"
            description="عند التسجيل من الصفحة الرئيسية تظهر الطلبات هنا فورًا."
          />
        ) : (
          <div className="space-y-3">
            {sorted.map((req) => {
              const order =
                orderMap.get(req.id) ||
                Number(dailyQueueFromRequestNumber(req.requestNumber)) ||
                null;
              return (
                <Link
                  key={req.id}
                  href={`/secretary/appointments/${req.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-border p-4 hover:bg-background md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-latin flex h-9 min-w-9 items-center justify-center rounded-xl bg-soft-teal px-2 text-lg font-bold text-teal">
                        {order ? toLatinDigits(order) : "—"}
                      </span>
                      <p className="font-semibold text-navy">{req.fullName}</p>
                    </div>
                    <p className="font-latin mt-1 text-sm text-muted" data-numeric="true">
                      {req.phone}
                    </p>
                    <p className="mt-1 text-sm">
                      {appointmentTypeAr[req.appointmentType]} — {req.reason}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatArabicDate(req.createdAt)}
                    </p>
                  </div>
                  <StatusBadge
                    label={appointmentStatusAr[req.status]}
                    tone={req.isEmergency ? "danger" : "blue"}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}
