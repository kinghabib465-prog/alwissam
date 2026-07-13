import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";
import { generateNumber } from "@/lib/utils";
import { isDoctorAvailable } from "@/lib/services/appointments";

/**
 * توجيه حالة عادية من الأخصائي (فؤاد) إلى الطبيب العام مع تحديد موعد
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["DOCTOR_SPECIALIST", "ADMIN"].includes(user.role.code)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const patientId = String(body.patientId || "");
  const dateStr = String(body.date || "");
  const timeStr = String(body.time || "10:00");
  const reason = String(body.reason || "حالة عادية — توجيه للطبيب العام").trim();
  const notes = String(body.notes || "").trim();
  const toDoctorId = String(body.toDoctorId || "");

  if (!patientId || !dateStr) {
    return NextResponse.json({ error: "المريض والتاريخ مطلوبان" }, { status: 400 });
  }

  const fromDoctor = await prisma.doctor.findFirst({
    where: { userId: user.id, isActive: true },
  });
  if (!fromDoctor && user.role.code !== "ADMIN") {
    return NextResponse.json({ error: "ملف الطبيب غير موجود" }, { status: 400 });
  }

  const general =
    (toDoctorId
      ? await prisma.doctor.findFirst({
          where: { id: toDoctorId, type: "GENERAL", isActive: true },
        })
      : null) ||
    (await prisma.doctor.findFirst({
      where: { type: "GENERAL", isActive: true },
      orderBy: { createdAt: "asc" },
    }));

  if (!general) {
    return NextResponse.json({ error: "لا يوجد طبيب عام نشط" }, { status: 404 });
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.deletedAt) {
    return NextResponse.json({ error: "المريض غير موجود" }, { status: 404 });
  }

  const [hh, mm] = timeStr.split(":").map(Number);
  const startAt = new Date(`${dateStr}T00:00:00`);
  startAt.setHours(hh || 10, mm || 0, 0, 0);
  if (Number.isNaN(startAt.getTime()) || startAt < new Date()) {
    return NextResponse.json({ error: "تاريخ/وقت غير صالح" }, { status: 400 });
  }
  const endAt = new Date(startAt.getTime() + 30 * 60_000);

  const availability = await isDoctorAvailable({
    doctorId: general.id,
    startAt,
    endAt,
  });
  if (!availability.ok) {
    return NextResponse.json(
      { error: availability.reason || "الطبيب العام غير متاح في هذا الوقت" },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const referral = await tx.referral.create({
      data: {
        patientId,
        fromDoctorId: fromDoctor?.id || general.id,
        toDoctorId: general.id,
        reason,
        notes: notes || null,
        status: "SCHEDULED",
      },
    });

    const appointment = await tx.appointment.create({
      data: {
        appointmentNumber: generateNumber("APT"),
        patientId,
        doctorId: general.id,
        appointmentType: "GENERAL_EXAM",
        status: "CONFIRMED",
        startAt,
        endAt,
        durationMinutes: 30,
        notes:
          notes ||
          `موعد بعد توجيه من ${user.fullName} — ${reason}`,
        createdById: user.id,
        statusHistory: {
          create: {
            newStatus: "CONFIRMED",
            changedById: user.id,
            reason: `توجيه للطبيب العام وتحديد موعد بواسطة ${user.fullName}`,
          },
        },
      },
    });

    return { referral, appointment };
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "REFERRED_TO_GENERAL_WITH_APPOINTMENT",
    entityType: "Appointment",
    entityId: result.appointment.id,
    newValue: {
      patientId,
      toDoctorId: general.id,
      startAt: startAt.toISOString(),
      referralId: result.referral.id,
    },
    reason: `توجيه ${patient.fullName} للطبيب العام مع موعد`,
  });

  return NextResponse.json({
    ok: true,
    appointmentId: result.appointment.id,
    referralId: result.referral.id,
    startAt: startAt.toISOString(),
  });
}
