import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";
import { generateNumber } from "@/lib/utils";

/** استلام مبلغ أرسله الطبيب بعد المعاينة */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["SECRETARY", "ADMIN"].includes(user.role.code)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const invoiceId = String(body.invoiceId || "");
  const method = String(body.method || "CASH");
  const entryId = body.entryId ? String(body.entryId) : null;
  const appointmentId = body.appointmentId ? String(body.appointmentId) : null;

  if (!invoiceId) {
    return NextResponse.json({ error: "الفاتورة مطلوبة" }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { patient: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
  }
  if (invoice.status === "PAID" || invoice.status === "VOIDED") {
    return NextResponse.json({ error: "الفاتورة مغلقة" }, { status: 400 });
  }

  const remaining = new Prisma.Decimal(invoice.remainingAmount);
  if (remaining.lessThanOrEqualTo(0)) {
    return NextResponse.json({ error: "لا يوجد متبقي" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId,
        amount: remaining,
        method: method as "CASH" | "CARD" | "BANK_TRANSFER" | "OTHER",
        receiptNumber: generateNumber("RCP"),
        createdById: user.id,
        notes: `استلام مبلغ المعاينة بواسطة ${user.fullName}`,
      },
    });

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: invoice.totalAmount,
        remainingAmount: new Prisma.Decimal(0),
        status: "PAID",
      },
    });

    const aptId = appointmentId || invoice.appointmentId;
    if (aptId) {
      const apt = await tx.appointment.findUnique({ where: { id: aptId } });
      if (apt) {
        await tx.appointment.update({
          where: { id: aptId },
          data: {
            status: "COMPLETED",
            statusHistory: {
              create: {
                previousStatus: apt.status,
                newStatus: "COMPLETED",
                changedById: user.id,
                reason: `استلام الدفع بواسطة ${user.fullName}`,
              },
            },
          },
        });
      }
    }

    if (entryId) {
      await tx.waitingRoomEntry.update({
        where: { id: entryId },
        data: { status: "LEFT", completedAt: new Date(), note: "تم الدفع" },
      });
    } else if (invoice.appointmentId) {
      await tx.waitingRoomEntry.updateMany({
        where: {
          appointmentId: invoice.appointmentId,
          status: { not: "LEFT" },
        },
        data: { status: "LEFT", completedAt: new Date(), note: "تم الدفع" },
      });
    }
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "DOCTOR_CHARGE_COLLECTED",
    entityType: "Invoice",
    entityId: invoiceId,
    newValue: { amount: Number(remaining), method },
    reason: `استلام دفع ${invoice.patient.fullName} بواسطة ${user.fullName}`,
  });

  return NextResponse.json({ ok: true });
}
