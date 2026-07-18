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

    try {
      await prisma.$transaction(async (tx) => {
        const locked = await tx.waitingRoomEntry.updateMany({
          where: { id: entryId, status: "WITH_DOCTOR" },
          data: {
            status: covered ? "LEFT" : "SESSION_DONE",
            completedAt: new Date(),
            note: covered
              ? note || "مغطى — بدون دفع فوري"
              : `مبلغ مطلوب: ${amount} دج${note ? ` — ${note}` : ""}`,
          },
        });
        if (locked.count === 0) {
          throw new Error("المعاينة منتهية مسبقاً أو لم تبدأ بعد");
        }

        await tx.appointment.update({
          where: { id: entry.appointmentId },
          data: {
            status: covered ? "COMPLETED" : "FOLLOW_UP_REQUIRED",
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
                newStatus: covered ? "COMPLETED" : "FOLLOW_UP_REQUIRED",
                changedById: user.id,
                reason: covered
                  ? `إنهاء معاينة مغطاة بواسطة ${user.fullName}`
                  : `إنهاء المعاينة بواسطة ${user.fullName}`,
                note,
              },
            },
          },
        });

        if (!covered) {
          const existingInvoice = await tx.invoice.findFirst({
            where: {
              appointmentId: entry.appointmentId,
              status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
            },
          });
          if (existingInvoice) {
            throw new Error("فاتورة هذه الزيارة موجودة مسبقاً");
          }
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
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "فشل إنهاء المعاينة" },
        { status: 400 },
      );
    }

    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "EXAM_COMPLETED_CHARGE",
      entityType: "WaitingRoomEntry",
      entityId: entryId,
      newValue: { amount: covered ? 0 : amount, covered, invoiceId, note },
      reason: `إرسال مبلغ الدفع للسكرتارية بواسطة ${user.fullName}`,
    });

    await publishEvent("clinic:waiting-room", {
      id: entryId,
      status: covered ? "LEFT" : "SESSION_DONE",
    });

    return NextResponse.json({
      ok: true,
      message: covered
        ? "انتهت الزيارة (مغطى) — لا تنتظر عند السكرتارية"
        : "تم إرسال المبلغ للسكرتارية",
      invoiceId,
    });
  }

  if (action === "reject") {
    const privateReason = String(body.privateReason || "").trim();
    const publicReason = String(body.publicReason || "").trim();

    if (!privateReason || privateReason.length < 3) {
      return NextResponse.json(
        { error: "اكتب سبب الرفض للسكرتيرة (3 أحرف على الأقل)" },
        { status: 400 },
      );
    }

    const allowedReject = ["WAITING", "WITH_DOCTOR", "ARRIVED"];
    if (!allowedReject.includes(entry.status)) {
      return NextResponse.json(
        { error: "لا يمكن رفض هذا المريض في حالته الحالية" },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.waitingRoomEntry.update({
        where: { id: entryId },
        data: {
          status: "REJECTED_BY_DOCTOR",
          rejectedAt: new Date(),
          completedAt: new Date(),
          doctorPrivateReason: privateReason,
          doctorPublicReason: publicReason || null,
          note: `رفض/صرف بواسطة ${user.fullName}`,
        },
      });

      await tx.appointment.update({
        where: { id: entry.appointmentId },
        data: {
          status: "CANCELLED_BY_CLINIC",
          notes: [
            entry.appointment.notes,
            publicReason
              ? `صرف بلباقة: ${publicReason}`
              : "تم إنهاء الزيارة — راجع السكرتارية",
          ]
            .filter(Boolean)
            .join(" — "),
          statusHistory: {
            create: {
              previousStatus: entry.appointment.status,
              newStatus: "CANCELLED_BY_CLINIC",
              changedById: user.id,
              reason: `رفض/صرف بواسطة ${user.fullName}`,
              note: privateReason,
            },
          },
        },
      });
    });

    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "PATIENT_REJECTED_BY_DOCTOR",
      entityType: "WaitingRoomEntry",
      entityId: entryId,
      newValue: { privateReason, publicReason },
      reason: `رفض/صرف ${entry.patient.fullName} بواسطة ${user.fullName}`,
    });

    await publishEvent("clinic:waiting-room", {
      id: entryId,
      status: "REJECTED_BY_DOCTOR",
    });

    return NextResponse.json({
      ok: true,
      message: "تم إرسال الرفض للسكرتيرة — لن يرى المريض السبب الحقيقي",
    });
  }

  return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
}
