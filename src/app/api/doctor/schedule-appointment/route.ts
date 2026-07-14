import { NextRequest, NextResponse } from "next/server";
import { AppointmentType, DayOfWeek } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";
import { generateNumber } from "@/lib/utils";
import { isDoctorAvailable } from "@/lib/services/appointments";

const DAY_MAP: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

/** بداية الموعد = بداية أول فترة دوام في ذلك اليوم (الحجز باليوم فقط) */
async function dayAppointmentBounds(doctorId: string, dateStr: string, durationMinutes: number) {
  const startAt = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(startAt.getTime())) {
    return { error: "تاريخ غير صالح" as const };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOnly = new Date(startAt);
  dayOnly.setHours(0, 0, 0, 0);
  if (dayOnly < today) {
    return { error: "لا يمكن حجز يوم ماضٍ" as const };
  }

  const day = DAY_MAP[startAt.getDay()]!;
  const windows = await prisma.workingHour.findMany({
    where: { doctorId, dayOfWeek: day, isActive: true },
    orderBy: { startTime: "asc" },
  });
  if (windows.length === 0) {
    return { error: "الطبيب غير متاح في هذا اليوم" as const };
  }

  const [hh, mm] = windows[0]!.startTime.split(":").map(Number);
  startAt.setHours(hh || 10, mm || 0, 0, 0);
  const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);
  return { startAt, endAt };
}

/** تحديد موعد من قائمة مرضاي — يوم فقط بدون ساعة */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (
    !user ||
    !["DOCTOR_SPECIALIST", "ADMIN"].includes(user.role.code)
  ) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const patientId = String(body.patientId || "");
  const dateStr = String(body.date || "");
  const typeRaw = String(body.appointmentType || "ORTHO_FOLLOWUP");
  const notes = String(body.notes || "").trim();
  const forDoctorId = String(body.forDoctorId || "");
  const durationMinutes = Math.min(180, Math.max(15, Number(body.durationMinutes) || 30));

  if (!patientId || !dateStr) {
    return NextResponse.json({ error: "المريض والتاريخ مطلوبان" }, { status: 400 });
  }

  const selfDoctor = await prisma.doctor.findFirst({
    where: { userId: user.id, isActive: true },
  });
  if (!selfDoctor && user.role.code !== "ADMIN") {
    return NextResponse.json({ error: "ملف الطبيب غير موجود" }, { status: 400 });
  }

  let doctor = selfDoctor;
  if (forDoctorId) {
    const target = await prisma.doctor.findFirst({
      where: { id: forDoctorId, isActive: true },
    });
    if (!target) {
      return NextResponse.json({ error: "الطبيب المستهدف غير موجود" }, { status: 404 });
    }
    doctor = target;
  }
  if (!doctor) {
    return NextResponse.json({ error: "ملف الطبيب غير موجود" }, { status: 400 });
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.deletedAt) {
    return NextResponse.json({ error: "المريض غير موجود" }, { status: 404 });
  }

  const validTypes = Object.values(AppointmentType);
  const appointmentType = validTypes.includes(typeRaw as AppointmentType)
    ? (typeRaw as AppointmentType)
    : AppointmentType.ORTHO_FOLLOWUP;

  const bounds = await dayAppointmentBounds(doctor.id, dateStr, durationMinutes);
  if ("error" in bounds) {
    return NextResponse.json({ error: bounds.error }, { status: 400 });
  }
  const { startAt, endAt } = bounds;

  const availability = await isDoctorAvailable({
    doctorId: doctor.id,
    startAt,
    endAt,
    dayOnly: true,
  });
  if (!availability.ok) {
    return NextResponse.json(
      { error: availability.reason || "الطبيب غير متاح في هذا اليوم" },
      { status: 400 },
    );
  }

  const appointment = await prisma.appointment.create({
    data: {
      appointmentNumber: generateNumber("APT"),
      patientId,
      doctorId: doctor.id,
      appointmentType,
      status: "CONFIRMED",
      startAt,
      endAt,
      durationMinutes,
      notes: notes || `موعد يومي محدد بواسطة ${user.fullName}`,
      createdById: user.id,
      statusHistory: {
        create: {
          newStatus: "CONFIRMED",
          changedById: user.id,
          reason: `تحديد موعد (يوم فقط) من قائمة مرضاي بواسطة ${user.fullName}`,
        },
      },
    },
  });

  await prisma.orthodonticCase.updateMany({
    where: { patientId, doctorId: doctor.id, status: { in: ["IN_PROGRESS", "NOT_STARTED"] } },
    data: { nextAppointment: startAt },
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "APPOINTMENT_SCHEDULED_BY_DOCTOR",
    entityType: "Appointment",
    entityId: appointment.id,
    newValue: {
      patientId,
      doctorId: doctor.id,
      startAt: startAt.toISOString(),
      appointmentType,
      dayOnly: true,
    },
    reason: `تحديد موعد للمريض ${patient.fullName}`,
  });

  return NextResponse.json({
    ok: true,
    appointment: { id: appointment.id, startAt: appointment.startAt.toISOString() },
  });
}

/** تعديل موعد موجود — يوم فقط */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["DOCTOR_SPECIALIST", "ADMIN"].includes(user.role.code)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const appointmentId = String(body.appointmentId || "");
  const dateStr = String(body.date || "");
  if (!appointmentId || !dateStr) {
    return NextResponse.json({ error: "الموعد والتاريخ مطلوبان" }, { status: 400 });
  }

  const doctor = await prisma.doctor.findFirst({
    where: { userId: user.id, isActive: true },
  });
  if (!doctor) {
    return NextResponse.json({ error: "ملف الطبيب غير موجود" }, { status: 400 });
  }

  const apt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!apt || apt.doctorId !== doctor.id) {
    return NextResponse.json({ error: "الموعد غير موجود" }, { status: 404 });
  }

  const bounds = await dayAppointmentBounds(
    doctor.id,
    dateStr,
    apt.durationMinutes || 30,
  );
  if ("error" in bounds) {
    return NextResponse.json({ error: bounds.error }, { status: 400 });
  }
  const { startAt, endAt } = bounds;

  const availability = await isDoctorAvailable({
    doctorId: doctor.id,
    startAt,
    endAt,
    ignoreAppointmentId: appointmentId,
    dayOnly: true,
  });
  if (!availability.ok) {
    return NextResponse.json(
      { error: availability.reason || "الطبيب غير متاح في هذا اليوم" },
      { status: 400 },
    );
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      startAt,
      endAt,
      status: "CONFIRMED",
      statusHistory: {
        create: {
          previousStatus: apt.status,
          newStatus: "CONFIRMED",
          changedById: user.id,
          reason: `تعديل يوم الموعد بواسطة ${user.fullName}`,
        },
      },
    },
  });

  await prisma.orthodonticCase.updateMany({
    where: {
      patientId: apt.patientId,
      doctorId: doctor.id,
      status: { in: ["IN_PROGRESS", "NOT_STARTED"] },
    },
    data: { nextAppointment: startAt },
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "APPOINTMENT_UPDATED_BY_DOCTOR",
    entityType: "Appointment",
    entityId: appointmentId,
    newValue: { startAt: startAt.toISOString(), dayOnly: true },
    reason: `تعديل موعد بواسطة ${user.fullName}`,
  });

  return NextResponse.json({ ok: true, startAt: startAt.toISOString() });
}
