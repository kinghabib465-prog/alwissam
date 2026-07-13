import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";
import { generateNumber } from "@/lib/utils";
import { publishEvent } from "@/lib/db/redis";

/** بدء المعاينة: المريض عند الطبيب */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (
    !user ||
    !["DOCTOR_GENERAL", "DOCTOR_SPECIALIST", "ADMIN"].includes(user.role.code)
  ) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const entryId = String(body.entryId || "");
  const action = String(body.action || "start"); // start | complete
  if (!entryId) {
    return NextResponse.json({ error: "معرّف الانتظار مطلوب" }, { status: 400 });
  }

  const doctor = await prisma.doctor.findFirst({
    where: { userId: user.id, isActive: true },
  });
  if (!doctor && user.role.code !== "ADMIN") {
    return NextResponse.json({ error: "ملف الطبيب غير موجود" }, { status: 400 });
  }

  const entry = await prisma.waitingRoomEntry.findUnique({
    where: { id: entryId },
    include: { appointment: true, patient: true },
  });
  if (!entry) {
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  }
  if (doctor && entry.doctorId !== doctor.id && user.role.code !== "ADMIN") {
    return NextResponse.json({ error: "هذا المريض ليس في قائمتك" }, { status: 403 });
  }

  if (action === "start") {
    const updated = await prisma.waitingRoomEntry.update({
      where: { id: entryId },
      data: { status: "WITH_DOCTOR", startedAt: new Date(), calledAt: new Date() },
    });
    await prisma.appointment.update({
      where: { id: entry.appointmentId },
      data: {
        status: "IN_TREATMENT",
        statusHistory: {
          create: {
            previousStatus: entry.appointment.status,
            newStatus: "IN_TREATMENT",
            changedById: user.id,
            reason: `بدء المعاينة بواسطة ${user.fullName}`,
          },
        },
      },
    });
    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "EXAM_STARTED",
      entityType: "WaitingRoomEntry",
      entityId: entryId,
      reason: `معاينة ${entry.patient.fullName}`,
    });
    await publishEvent("clinic:waiting-room", { id: entryId, status: "WITH_DOCTOR" });
    return NextResponse.json({ ok: true, entry: updated });
  }

  if (action === "complete") {
    const amount = Number(body.amount);
    const note = String(body.note || "").trim();
    const covered = !!body.covered; // مغطى بدون مبلغ الآن

    if (!covered && (!amount || amount <= 0)) {
      return NextResponse.json(
        { error: "أدخل المبلغ الذي يدفعه المريض للسكرتارية" },
        { status: 400 },
      );
    }

    let invoiceId: string | null = null;

    await prisma.$transaction(async (tx) => {
      await tx.waitingRoomEntry.update({
        where: { id: entryId },
        data: {
          status: "SESSION_DONE",
          completedAt: new Date(),
          note: covered
            ? note || "مغطى — بدون دفع فوري"
            : `مبلغ مطلوب: ${amount} دج${note ? ` — ${note}` : ""}`,
        },
      });

      await tx.appointment.update({
        where: { id: entry.appointmentId },
        data: {
          status: "FOLLOW_UP_REQUIRED",
          notes: [
            entry.appointment.notes,
            covered
              ? `بعد المعاينة: مغطى — ${note || "بدون دفع فوري"}`
              : `بعد المعاينة: يدفع ${amount} دج — ${note || ""}`,
          ]
            .filter(Boolean)
            .join(" — "),
          statusHistory: {
            create: {
              previousStatus: entry.appointment.status,
              newStatus: "FOLLOW_UP_REQUIRED",
              changedById: user.id,
              reason: `إنهاء المعاينة بواسطة ${user.fullName}`,
              note,
            },
          },
        },
      });

      if (!covered) {
        const decimal = new Prisma.Decimal(amount);
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber: generateNumber("INV"),
            patientId: entry.patientId,
            appointmentId: entry.appointmentId,
            doctorId: entry.doctorId,
            totalAmount: decimal,
            paidAmount: new Prisma.Decimal(0),
            remainingAmount: decimal,
            status: "ISSUED",
            notes: `مبلغ من الطبيب بعد المعاينة — ${user.fullName}${note ? ` — ${note}` : ""}`,
            createdById: user.id,
          },
        });
        invoiceId = invoice.id;
      }
    });

    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "EXAM_COMPLETED_CHARGE",
      entityType: "WaitingRoomEntry",
      entityId: entryId,
      newValue: { amount: covered ? 0 : amount, covered, invoiceId, note },
      reason: `إرسال مبلغ الدفع للسكرتارية بواسطة ${user.fullName}`,
    });

    await publishEvent("clinic:waiting-room", { id: entryId, status: "SESSION_DONE" });

    return NextResponse.json({
      ok: true,
      message: covered
        ? "تم إنهاء المعاينة بدون مبلغ فوري"
        : "تم إرسال المبلغ للسكرتارية",
      invoiceId,
    });
  }

  return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
}
