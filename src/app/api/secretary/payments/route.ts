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

  const invoice = await prisma.invoice.findUnique({
    where: { id: parsed.data.invoiceId },
  });
  if (!invoice) {
    return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
  }

  const amount = new Prisma.Decimal(parsed.data.amount);
  const newPaid = new Prisma.Decimal(invoice.paidAmount).add(amount);
  const remaining = new Prisma.Decimal(invoice.totalAmount).sub(newPaid);

  const payment = await prisma.$transaction(async (tx) => {
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

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaid,
        remainingAmount: remaining.lessThan(0) ? new Prisma.Decimal(0) : remaining,
        status: remaining.lessThanOrEqualTo(0) ? "PAID" : "PARTIALLY_PAID",
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
}
