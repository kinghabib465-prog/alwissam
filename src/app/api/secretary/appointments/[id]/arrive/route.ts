import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";
import { publishEvent } from "@/lib/db/redis";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !["SECRETARY", "ADMIN"].includes(user.role.code)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const { id } = await context.params;
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) {
    return NextResponse.json({ error: "الموعد غير موجود" }, { status: 404 });
  }

  const entry = await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id },
      data: {
        status: "PATIENT_ARRIVED",
        statusHistory: {
          create: {
            previousStatus: appointment.status,
            newStatus: "PATIENT_ARRIVED",
            changedById: user.id,
            reason: `تم تسجيل الوصول بواسطة ${user.fullName}`,
          },
        },
      },
    });

    return tx.waitingRoomEntry.upsert({
      where: { appointmentId: id },
      update: {
        status: "ARRIVED",
        arrivedAt: new Date(),
        urgency: appointment.isEmergency,
      },
      create: {
        appointmentId: id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        status: "ARRIVED",
        urgency: appointment.isEmergency,
      },
    });
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "PATIENT_ARRIVED",
    entityType: "Appointment",
    entityId: id,
    reason: `تم تسجيل الوصول بواسطة ${user.fullName}`,
  });

  await publishEvent("clinic:waiting-room", { entryId: entry.id, status: "ARRIVED" });

  return NextResponse.json({ ok: true, entry });
}
