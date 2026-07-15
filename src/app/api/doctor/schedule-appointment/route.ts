import { NextRequest, NextResponse } from "next/server";
import { AppointmentType, DayOfWeek } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";
import { generateNumber } from "@/lib/utils";
import { isDoctorAvailable } from "@/lib/services/appointments";
import { algiersDateTime, algiersYmdBounds } from "@/lib/clinic-date";
import {
  SHIFT_LABEL_AR,
  normalizeShift,
  type WorkShift,
} from "@/lib/doctor-availability";

const DAY_MAP: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

/**
 * حدود موعد يومي لفترة (صباح/مساء):
 * startAt = بداية فترة الدوام المختارة بتوقيت الجزائر
 */
async function dayAppointmentBounds(
  doctorId: string,
  dateStr: string,
  durationMinutes: number,
  shiftRaw?: string | null,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { error: "تاريخ غير صالح" as const };
  }

  const { start: dayStart } = algiersYmdBounds(dateStr);
  const todayStart = algiersYmdBounds(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Algiers",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  ).start;
  if (dayStart < todayStart) {
    return { error: "لا يمكن حجز يوم ماضٍ" as const };
  }

  const [y, m, d] = dateStr.split("-").map(Number);
  const weekday = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0)).getUTCDay();
  const dayEnum = DAY_MAP[weekday]!;

  const windows = await prisma.workingHour.findMany({
    where: { doctorId, dayOfWeek: dayEnum, isActive: true },
    orderBy: { startTime: "asc" },
  });
  if (windows.length === 0) {
    return { error: "الطبيب غير متاح في هذا اليوم" as const };
  }

  const wanted = shiftRaw ? normalizeShift(shiftRaw) : null;
  let chosen = wanted
    ? windows.find((w) => normalizeShift(w.shift) === wanted)
    : undefined;

  if (wanted && wanted !== "DAY" && !chosen) {
    return {
      error:
        wanted === "EVENING"
          ? "لا يوجد دوام مسائي في هذا اليوم"
          : "لا يوجد دوام صباحي في هذا اليوم",
    } as const;
  }

  if (!chosen) {
    // تلقائي: إن وُجد DAY استخدمه، وإلا أول نافذة
    chosen =
      windows.find((w) => normalizeShift(w.shift) === "DAY") || windows[0]!;
  }

  const shift = normalizeShift(chosen.shift);
  const startAt = algiersDateTime(dateStr, chosen.startTime);
  const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);
  return { startAt, endAt, shift, window: chosen };
}

function periodNote(shift: WorkShift, userName: string) {
  return `موعد ${SHIFT_LABEL_AR[shift]} — محدد بواسطة ${userName}`;
}

/** تحديد موعد من قائمة مرضاي — يوم + صباح/مساء */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (
    !user ||
    !["DOCTOR_SPECIALIST", "DOCTOR_GENERAL", "ADMIN"].includes(user.role.code)
  ) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const patientId = String(body.patientId || "");
  const dateStr = String(body.date || "");
  const shiftRaw = body.shift != null ? String(body.shift) : "";
  const typeRaw = String(body.appointmentType || "ORTHO_FOLLOWUP");
  const notes = String(body.notes || "").trim();
  const forDoctorId = String(body.forDoctorId || "");
  const durationMinutes = Math.min(
    180,
    Math.max(15, Number(body.durationMinutes) || 30),
  );

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

  const bounds = await dayAppointmentBounds(
    doctor.id,
    dateStr,
    durationMinutes,
    shiftRaw || null,
  );
  if ("error" in bounds) {
    return NextResponse.json({ error: bounds.error }, { status: 400 });
  }
  const { startAt, endAt, shift } = bounds;

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

  const noteLine = notes || periodNote(shift, user.fullName);

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
      notes: noteLine,
      createdById: user.id,
      statusHistory: {
        create: {
          newStatus: "CONFIRMED",
          changedById: user.id,
          reason: `تحديد موعد (${SHIFT_LABEL_AR[shift]}) بواسطة ${user.fullName}`,
        },
      },
    },
  });

  await prisma.orthodonticCase.updateMany({
    where: {
      patientId,
      doctorId: doctor.id,
      status: { in: ["IN_PROGRESS", "NOT_STARTED"] },
    },
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
      shift,
      dayOnly: true,
    },
    reason: `تحديد موعد للمريض ${patient.fullName}`,
  });

  return NextResponse.json({
    ok: true,
    appointment: {
      id: appointment.id,
      startAt: appointment.startAt.toISOString(),
      shift,
    },
  });
}

/** تعديل موعد موجود — يوم + فترة */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (
    !user ||
    !["DOCTOR_SPECIALIST", "DOCTOR_GENERAL", "ADMIN"].includes(user.role.code)
  ) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const appointmentId = String(body.appointmentId || "");
  const dateStr = String(body.date || "");
  const shiftRaw = body.shift != null ? String(body.shift) : "";
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
    shiftRaw || null,
  );
  if ("error" in bounds) {
    return NextResponse.json({ error: bounds.error }, { status: 400 });
  }
  const { startAt, endAt, shift } = bounds;

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
      notes: periodNote(shift, user.fullName),
      statusHistory: {
        create: {
          previousStatus: apt.status,
          newStatus: "CONFIRMED",
          changedById: user.id,
          reason: `تعديل الموعد إلى ${SHIFT_LABEL_AR[shift]} بواسطة ${user.fullName}`,
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
    newValue: { startAt: startAt.toISOString(), shift, dayOnly: true },
    reason: `تعديل موعد بواسطة ${user.fullName}`,
  });

  return NextResponse.json({
    ok: true,
    startAt: startAt.toISOString(),
    shift,
  });
}
