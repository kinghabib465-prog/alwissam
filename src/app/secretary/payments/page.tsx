import { Suspense } from "react";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { navSecretaryAr } from "@/i18n/ar";
import { formatCurrencyDZD, formatArabicDate } from "@/lib/utils";
import { CollectDoctorChargeForm } from "@/components/secretary/CollectDoctorChargeForm";
import { PaymentHighlight } from "@/components/secretary/PaymentHighlight";

export const dynamic = "force-dynamic";

export default async function SecretaryPaymentsPage() {
  const user = await requireUser(["SECRETARY", "ADMIN"]);

  const [openInvoices, payments] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
      include: {
        patient: true,
        appointment: { include: { waitingRoomEntry: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.payment.findMany({
      include: {
        invoice: { include: { patient: true } },
        createdBy: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <DashboardShell items={navSecretaryAr as never} userName={user.fullName}>
      <TopHeader
        title="قائمة الدفع"
        subtitle="مبالغ يرسلها الطبيب بعد المعاينة — استلمها هنا"
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold text-navy">بانتظار الاستلام</h2>
          <Suspense fallback={null}>
            <PaymentHighlight />
          </Suspense>
          {openInvoices.length === 0 ? (
            <EmptyState
              title="لا مبالغ بانتظار الدفع"
              description="بعد إنهاء الطبيب للمعاينة وإدخال المبلغ يظهر هنا."
            />
          ) : (
            <div className="space-y-3">
              {openInvoices.map((inv) => (
                <div key={inv.id} id={`invoice-${inv.id}`}>
                  <CollectDoctorChargeForm
                    invoiceId={inv.id}
                    patientName={inv.patient.fullName}
                    amount={Number(inv.remainingAmount)}
                    csrfToken={user.csrfToken}
                    entryId={inv.appointment?.waitingRoomEntry?.id}
                    appointmentId={inv.appointmentId}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-bold text-navy">آخر الاستلامات</h2>
          {payments.length === 0 ? (
            <EmptyState title="لا مدفوعات بعد" />
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-2xl border border-border p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {payment.invoice.patient.fullName}
                    </p>
                    <p className="font-latin">
                      {formatCurrencyDZD(Number(payment.amount))}
                    </p>
                  </div>
                  <p className="font-latin text-xs text-muted">
                    {payment.receiptNumber} · {formatArabicDate(payment.paymentDate)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
