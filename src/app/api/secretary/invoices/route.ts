import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";
import { generateNumber } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["SECRETARY", "ADMIN"].includes(user.role.code)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json();
  const patientId = String(body.patientId || "");
  const totalAmount = Number(body.totalAmount || 0);
  if (!patientId || totalAmount <= 0) {
    return NextResponse.json({ error: "بيانات الفاتورة غير صالحة" }, { status: 400 });
  }

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: generateNumber("INV"),
      patientId,
      appointmentId: body.appointmentId || undefined,
      treatmentPlanId: body.treatmentPlanId || undefined,
      doctorId: body.doctorId || undefined,
      totalAmount: new Prisma.Decimal(totalAmount),
      paidAmount: new Prisma.Decimal(0),
      remainingAmount: new Prisma.Decimal(totalAmount),
      discount: new Prisma.Decimal(Number(body.discount || 0)),
      discountReason: body.discountReason || undefined,
      notes: body.notes || undefined,
      createdById: user.id,
      status: "ISSUED",
    },
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "INVOICE_CREATED",
    entityType: "Invoice",
    entityId: invoice.id,
    newValue: invoice,
    reason: `تم إنشاء الفاتورة بواسطة ${user.fullName}`,
  });

  return NextResponse.json({ ok: true, invoice });
}
