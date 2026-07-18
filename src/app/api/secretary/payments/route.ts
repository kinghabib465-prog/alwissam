import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";
import { generateNumber } from "@/lib/utils";
import { paymentSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["SECRETARY", "ADMIN"].includes(user.role.code)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "بيانات غير صالحة" },
      { status: 400 },
    );
  }

  const amount = new Prisma.Decimal(parsed.data.amount);

  try {
    const payment = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "Invoice" WHERE id = ${parsed.data.invoiceId} FOR UPDATE`;

      const invoice = await tx.invoice.findUnique({
        where: { id: parsed.data.invoiceId },
      });
      if (!invoice) throw new Error("الفاتورة غير موجودة");
      if (invoice.status === "PAID" || invoice.status === "VOIDED") {
        throw new Error("الفاتورة مغلقة");
      }

      const remaining = new Prisma.Decimal(invoice.remainingAmount);
      if (remaining.lessThanOrEqualTo(0)) {
        throw new Error("لا يوجد متبقي");
      }
      if (amount.greaterThan(remaining)) {
        throw new Error("المبلغ أكبر من المتبقي");
      }

      const created = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount,
          method: parsed.data.method,
          receiptNumber: generateNumber("RCP"),
          notes: parsed.data.notes,
          createdById: user.id,
        },
      });

      const newPaid = new Prisma.Decimal(invoice.paidAmount).add(amount);
      const newRemaining = new Prisma.Decimal(invoice.totalAmount).sub(newPaid);

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaid,
          remainingAmount: newRemaining.lessThan(0)
            ? new Prisma.Decimal(0)
            : newRemaining,
          status: newRemaining.lessThanOrEqualTo(0) ? "PAID" : "PARTIALLY_PAID",
        },
      });

      return created;
    });

    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "PAYMENT_CREATED",
      entityType: "Payment",
      entityId: payment.id,
      newValue: payment,
      reason: `تم تسجيل الدفع بواسطة ${user.fullName}`,
    });

    return NextResponse.json({ ok: true, payment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "فشل الدفع" },
      { status: 400 },
    );
  }
}
