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
import {
  buildDoctorAppointmentNotes,
  validateDoctorAppointmentReason,
} from "@/lib/appointment-notes";
import {
  defaultAppointmentTypeForDoctor,
  appointmentTypeRestrictionError,
} from "@/lib/doctor-appointment-types";
import { isClinicOwner } from "@/lib/auth/clinic-owner";

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
  const typeRaw = String(
    body.appointmentType ||
      defaultAppointmentTypeForDoctor(isClinicOwner(user)),
  );
  const examReason = String(body.examReason || "").trim();
  const customReason = String(body.customReason || "").trim();
  const visitReason = String(body.visitReason || "").trim();
  const workPerformed = String(body.workPerformed || "").trim();
  const followUpNote = String(body.followUpNote || "").trim();
  const treatmentFinished = !!body.treatmentFinished;
  const forDoctorId = String(body.forDoctorId || "");
  const durationMinutes = Math.min(
    180,
    Math.max(15, Number(body.durationMinutes) || 30),
  );

  if (!patientId) {
    return NextResponse.json({ error: "المريض مطلوب" }, { status: 400 });
  }
  if (!treatmentFinished && !dateStr) {
    return NextResponse.json(
      { error: "المريض والتاريخ مطلوبان — أو حدّد انتهاء العلاج" },
      { status: 400 },
    );
  }
  if (!treatmentFinished) {
    if (!visitReason || visitReason.length < 2) {
      return NextResponse.json(
        { error: "اكتب سبب الزيارة (حرفان على الأقل)" },
        { status: 400 },
      );
    }
    if (!workPerformed || workPerformed.length < 2) {
      return NextResponse.json(
        { error: "اكتب ما تم عمله (حرفان على الأقل)" },
        { status: 400 },
      );
    }
  }
  if (workPerformed && workPerformed.length < 2) {
    return NextResponse.json(
      { error: "اكتب ما تم عمله (حرفان على الأقل)" },
      { status: 400 },
    );
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
    : isClinicOwner(user)
      ? AppointmentType.ORTHO_FOLLOWUP
      : AppointmentType.GENERAL_EXAM;

  const typeError = appointmentTypeRestrictionError(user, appointmentType);
  if (typeError) {
    return NextResponse.json({ error: typeError }, { status: 403 });
  }

  const reasonError = treatmentFinished
    ? null
    : validateDoctorAppointmentReason(
        appointmentType,
        examReason,
        customReason,
      );
  if (reasonError) {
    return NextResponse.json({ error: reasonError }, { status: 400 });
  }

  /** تحديث آخر جلسة معاينة بتفاصيل ما تم عمله */
  async function stampLastSessionDetails(
    tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">,
  ) {
    if (!visitReason && !workPerformed && !followUpNote && !treatmentFinished) {
      return null;
    }
    const lastSession = await tx.appointment.findFirst({
      where: {
        patientId,
        doctorId: doctor!.id,
        deletedAt: null,
        status: {
          in: [
            "IN_TREATMENT",
            "FOLLOW_UP_REQUIRED",
            "COMPLETED",
          ],
        },
      },
      orderBy: { startAt: "desc" },
    });
    if (!lastSession) return null;
    return tx.appointment.update({
      where: { id: lastSession.id },
      data: {
        ...(visitReason ? { visitReason } : {}),
        ...(workPerformed ? { workPerformed } : {}),
        ...(followUpNote ? { followUpNote } : {}),
        treatmentFinished,
      },
    });
  }

  const visitDetailFields = {
    ...(visitReason ? { visitReason } : {}),
    ...(workPerformed ? { workPerformed } : {}),
    ...(followUpNote ? { followUpNote } : {}),
  };

  if (treatmentFinished) {
    const stamped = await prisma.$transaction(async (tx) => {
      return stampLastSessionDetails(tx);
    });
    if (!stamped) {
      return NextResponse.json(
        {
          error:
            "لا توجد جلسة حديثة لتسجيل انتهاء العلاج — أكمل المعاينة أولاً أو اختر موعداً قادماً",
        },
        { status: 400 },
      );
    }
    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "TREATMENT_MARKED_FINISHED",
      entityType: "Appointment",
      entityId: stamped.id,
      newValue: { visitReason, workPerformed, treatmentFinished: true },
      reason: `انتهاء علاج المريض ${patient.fullName}`,
    });
    return NextResponse.json({
      ok: true,
      finished: true,
      appointment: { id: stamped.id },
    });
  }

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

  const noteLine = buildDoctorAppointmentNotes(appointmentType, {
    examReason,
    customReason,
    periodNote: periodNote(shift, user.fullName),
  });
  const { start: dayStart, end: dayEnd } = algiersYmdBounds(dateStr);

  /** موعد واحد للمريض في نفس اليوم — أي حجز لاحق يعدّل الموجود بدل إنشاء جديد */
  const ACTIVE_DAY_STATUSES = [
    "CONFIRMED",
    "REMINDER_SENT",
    "DOCTOR_ASSIGNED",
  ] as const;

  const existingSameDay = await prisma.appointment.findFirst({
    where: {
      patientId,
      deletedAt: null,
      startAt: { gte: dayStart, lt: dayEnd },
      status: { in: [...ACTIVE_DAY_STATUSES] },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (existingSameDay) {
    const others = await prisma.appointment.findMany({
      where: {
        patientId,
        id: { not: existingSameDay.id },
        deletedAt: null,
        startAt: { gte: dayStart, lt: dayEnd },
        status: { in: [...ACTIVE_DAY_STATUSES] },
      },
      select: { id: true },
    });

    const appointment = await prisma.$transaction(async (tx) => {
      await stampLastSessionDetails(tx);
      for (const o of others) {
        await tx.appointment.update({
          where: { id: o.id },
          data: {
            status: "CANCELLED_BY_CLINIC",
            deletedAt: new Date(),
            statusHistory: {
              create: {
                previousStatus: "CONFIRMED",
                newStatus: "CANCELLED_BY_CLINIC",
                changedById: user.id,
                reason: "إلغاء تكرار — موعد واحد يومياً للمريض",
              },
            },
          },
        });
      }

      return tx.appointment.update({
        where: { id: existingSameDay.id },
        data: {
          doctorId: doctor.id,
          appointmentType,
          status: "CONFIRMED",
          startAt,
          endAt,
          durationMinutes,
          notes: noteLine,
          // دائماً على الموعد القادم — للظهور الفوري في البطاقات
          ...visitDetailFields,
          statusHistory: {
            create: {
              previousStatus: existingSameDay.status,
              newStatus: "CONFIRMED",
              changedById: user.id,
              reason: `تحديث موعد اليوم (${SHIFT_LABEL_AR[shift]}) بواسطة ${user.fullName} — بدون تكرار`,
            },
          },
        },
      });
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
      action: "APPOINTMENT_UPSERTED_SAME_DAY",
      entityType: "Appointment",
      entityId: appointment.id,
      newValue: {
        patientId,
        doctorId: doctor.id,
        startAt: startAt.toISOString(),
        shift,
        mergedDuplicates: others.length,
        visitReason,
        workPerformed,
        followUpNote,
      },
      reason: `موعد واحد ليوم ${dateStr} — عُدّل بدل إنشاء جديد`,
    });

    return NextResponse.json({
      ok: true,
      updated: true,
      appointment: {
        id: appointment.id,
        startAt: appointment.startAt.toISOString(),
        shift,
      },
    });
  }

  const appointment = await prisma.$transaction(async (tx) => {
    await stampLastSessionDetails(tx);
    return tx.appointment.create({
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
        ...visitDetailFields,
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
      visitReason,
      workPerformed,
      followUpNote,
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

  // ألْغِ أي مواعيد أخرى لنفس المريض في نفس اليوم
  const { start: dayStart, end: dayEnd } = algiersYmdBounds(dateStr);
  await prisma.appointment.updateMany({
    where: {
      patientId: apt.patientId,
      id: { not: appointmentId },
      deletedAt: null,
      startAt: { gte: dayStart, lt: dayEnd },
      status: { in: ["CONFIRMED", "REMINDER_SENT", "DOCTOR_ASSIGNED"] },
    },
    data: {
      status: "CANCELLED_BY_CLINIC",
      deletedAt: new Date(),
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
