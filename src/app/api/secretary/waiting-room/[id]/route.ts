import { NextRequest, NextResponse } from "next/server";
import { WaitingRoomStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";
import { publishEvent } from "@/lib/db/redis";
import { removePatientBeforeDoctor } from "@/lib/services/appointments";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (
    !user ||
    !["SECRETARY", "ADMIN", "DOCTOR_GENERAL", "DOCTOR_SPECIALIST"].includes(
      user.role.code,
    )
  ) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  if (body.action === "remove") {
    if (!["SECRETARY", "ADMIN"].includes(user.role.code)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    try {
      await removePatientBeforeDoctor({
        waitingEntryId: id,
        userId: user.id,
        roleCode: user.role.code,
        userName: user.fullName,
      });
      return NextResponse.json({ ok: true, message: "تم الحذف" });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "فشل الحذف" },
        { status: 400 },
      );
    }
  }

  if (body.action === "dismiss_rejected") {
    if (!["SECRETARY", "ADMIN"].includes(user.role.code)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const entry = await prisma.waitingRoomEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    }
    if (entry.status !== "REJECTED_BY_DOCTOR") {
      return NextResponse.json(
        { error: "هذا السجل ليس في قائمة المرفوضين" },
        { status: 400 },
      );
    }
    await prisma.waitingRoomEntry.update({
      where: { id },
      data: {
        status: "LEFT",
        note: entry.note
          ? `${entry.note} — تم التعامل بواسطة ${user.fullName}`
          : `تم التعامل مع الرفض بواسطة ${user.fullName}`,
      },
    });
    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "REJECTED_PATIENT_DISMISSED",
      entityType: "WaitingRoomEntry",
      entityId: id,
      reason: `إغلاق ملف مرفوض بواسطة ${user.fullName}`,
    });
    await publishEvent("clinic:waiting-room", { id, status: "LEFT" });
    return NextResponse.json({ ok: true, message: "تم التعامل" });
  }

  if (body.action === "close_visit") {
    if (!["SECRETARY", "ADMIN"].includes(user.role.code)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const entry = await prisma.waitingRoomEntry.findUnique({
      where: { id },
      include: {
        appointment: {
          include: {
            invoices: {
              where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
              take: 1,
            },
          },
        },
      },
    });
    if (!entry) {
      return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    }
    if (entry.status !== "SESSION_DONE") {
      return NextResponse.json(
        { error: "الإغلاق بعد انتهاء المعاينة فقط" },
        { status: 400 },
      );
    }
    if (entry.appointment.invoices.length > 0) {
      return NextResponse.json(
        { error: "هنالك فاتورة معلقة — استخدمي الدفع أولاً" },
        { status: 400 },
      );
    }
    await prisma.$transaction(async (tx) => {
      await tx.waitingRoomEntry.update({
        where: { id },
        data: {
          status: "LEFT",
          completedAt: new Date(),
          note: entry.note
            ? `${entry.note} — أُغلقت بواسطة السكرتارية`
            : "أُغلقت الزيارة بدون فاتورة معلقة",
        },
      });
      await tx.appointment.update({
        where: { id: entry.appointmentId },
        data: {
          status: "COMPLETED",
          statusHistory: {
            create: {
              previousStatus: entry.appointment.status,
              newStatus: "COMPLETED",
              changedById: user.id,
              reason: `إغلاق زيارة بواسطة ${user.fullName}`,
            },
          },
        },
      });
    });
    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "VISIT_CLOSED_BY_SECRETARY",
      entityType: "WaitingRoomEntry",
      entityId: id,
      reason: `إغلاق زيارة بواسطة ${user.fullName}`,
    });
    await publishEvent("clinic:waiting-room", { id, status: "LEFT" });
    return NextResponse.json({ ok: true, message: "أُغلقت الزيارة" });
  }

  const status = body.status as WaitingRoomStatus;

  const existing = await prisma.waitingRoomEntry.findUnique({
    where: { id },
    include: { appointment: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  }

  const data: Record<string, unknown> = { status };
  if (status === "WITH_DOCTOR") data.startedAt = new Date();
  if (status === "SESSION_DONE" || status === "LEFT") {
    data.completedAt = new Date();
  }

  const aptStatusMap: Record<string, string> = {
    ARRIVED: "PATIENT_ARRIVED",
    WAITING: "WAITING_ROOM",
    WITH_DOCTOR: "IN_TREATMENT",
    SESSION_DONE: "FOLLOW_UP_REQUIRED",
    LEFT: "COMPLETED",
  };
  const nextAptStatus = aptStatusMap[status];

  await prisma.$transaction(async (tx) => {
    await tx.waitingRoomEntry.update({
      where: { id },
      data,
    });
    if (nextAptStatus && existing.appointment.status !== nextAptStatus) {
      await tx.appointment.update({
        where: { id: existing.appointmentId },
        data: {
          status: nextAptStatus as never,
          statusHistory: {
            create: {
              previousStatus: existing.appointment.status,
              newStatus: nextAptStatus as never,
              changedById: user.id,
              reason: `مزامنة حالة الانتظار → الموعد بواسطة ${user.fullName}`,
            },
          },
        },
      });
    }
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "WAITING_ROOM_STATUS_CHANGE",
    entityType: "WaitingRoomEntry",
    entityId: id,
    oldValue: { status: existing.status },
    newValue: { status, appointmentStatus: nextAptStatus },
    reason: `تم التحديث بواسطة ${user.fullName}`,
  });

  await publishEvent("clinic:waiting-room", { id, status });

  return NextResponse.json({ ok: true });
}
