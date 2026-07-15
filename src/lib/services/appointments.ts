import {
  AppointmentStatus,
  AppointmentType,
  DayOfWeek,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { generateNumber } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit/log";
import { publishEvent } from "@/lib/db/redis";
import { algiersDayBounds } from "@/lib/daily-queue";

const DAY_MAP: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export async function isDoctorAvailable(params: {
  doctorId: string;
  startAt: Date;
  endAt: Date;
  ignoreAppointmentId?: string;
  /** حجز باليوم فقط — بدون التحقق من تعارض الساعات */
  dayOnly?: boolean;
}) {
  const day = DAY_MAP[params.startAt.getDay()];
  const startMin =
    params.startAt.getHours() * 60 + params.startAt.getMinutes();
  const endMin = params.endAt.getHours() * 60 + params.endAt.getMinutes();

  const workingHours = await prisma.workingHour.findMany({
    where: { doctorId: params.doctorId, dayOfWeek: day, isActive: true },
  });

  if (workingHours.length === 0) return { ok: false, reason: "الطبيب غير متاح في هذا اليوم" };

  if (!params.dayOnly) {
    const withinShift = workingHours.some(
      (wh) => startMin >= toMinutes(wh.startTime) && endMin <= toMinutes(wh.endTime),
    );
    if (!withinShift) {
      return { ok: false, reason: "الوقت خارج ساعات عمل الطبيب" };
    }
  }

  const exception = await prisma.doctorScheduleException.findFirst({
    where: {
      doctorId: params.doctorId,
      startAt: { lte: params.endAt },
      endAt: { gte: params.startAt },
      type: {
        in: [
          "SPECIAL_CLOSING_DAY",
          "VACATION",
          "BLOCKED_TIME",
          "SURGERY_BLOCK",
          "MORNING_CLOSED",
          "EVENING_CLOSED",
        ],
      },
    },
  });
  if (exception) {
    return { ok: false, reason: exception.reason || "الوقت محظور في جدول الطبيب" };
  }

  if (params.dayOnly) {
    return { ok: true };
  }

  const conflict = await prisma.appointment.findFirst({
    where: {
      doctorId: params.doctorId,
      deletedAt: null,
      id: params.ignoreAppointmentId ? { not: params.ignoreAppointmentId } : undefined,
      status: {
        notIn: [
          "CANCELLED_BY_CLINIC",
          "CANCELLED_BY_PATIENT",
          "NO_SHOW",
          "RESCHEDULED",
        ],
      },
      startAt: { lt: params.endAt },
      endAt: { gt: params.startAt },
    },
  });

  if (conflict) {
    return { ok: false, reason: "يوجد تعارض مع موعد آخر" };
  }

  return { ok: true as const };
}

export async function createAppointmentRequest(input: {
  fullName: string;
  phone?: string;
  age?: number;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE";
  city?: string;
  chronicIllnesses?: string;
  reason?: string;
  appointmentType: AppointmentType;
  isEmergency?: boolean;
  preferredDoctorId?: string;
  preferredDate?: string;
  preferredTime?: string;
  isPreviousPatient?: boolean;
  hasOrthodontics?: boolean;
  previousSurgery?: boolean;
  additionalNotes?: string;
  consentAccepted: boolean;
}) {
  let service = await prisma.service.findUnique({
    where: { code: input.appointmentType },
  });
  if (!service && input.appointmentType === "LASER_WHITENING") {
    service = await prisma.service.create({
      data: {
        code: "LASER_WHITENING",
        nameAr: "تبييض الأسنان بالليزر",
        category: "تجميل",
        defaultDuration: 60,
        isActive: true,
      },
    });
  }

  const { ymd, start, end } = algiersDayBounds();

  const { request, queueNumber } = await prisma.$transaction(async (tx) => {
    const todayCount = await tx.appointmentRequest.count({
      where: { createdAt: { gte: start, lt: end } },
    });
    const queue = todayCount + 1;
    // فريد داخلياً — المعروض دائماً رقم الترتيب فقط
    const requestNumber = `${ymd}-${queue}`;

    const created = await tx.appointmentRequest.create({
      data: {
        requestNumber,
        fullName: input.fullName,
        phone: input.phone?.trim() || "",
        age: input.age,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
        gender: input.gender,
        city: input.city,
        chronicIllnesses: input.chronicIllnesses?.trim() || undefined,
        reason: input.reason?.trim() || service?.nameAr || "طلب موعد",
        appointmentType: input.appointmentType,
        serviceId: service?.id,
        isEmergency: !!input.isEmergency,
        preferredDoctorId: input.preferredDoctorId || undefined,
        preferredDate: input.preferredDate
          ? new Date(input.preferredDate)
          : undefined,
        preferredTime: input.preferredTime,
        isPreviousPatient: !!input.isPreviousPatient,
        hasOrthodontics: !!input.hasOrthodontics,
        previousSurgery: !!input.previousSurgery,
        additionalNotes: input.additionalNotes,
        consentAccepted: input.consentAccepted,
        status: input.isEmergency ? "EMERGENCY" : "NEW_REQUEST",
        statusHistory: {
          create: {
            newStatus: input.isEmergency ? "EMERGENCY" : "NEW_REQUEST",
            reason: "طلب موعد من الموقع العام",
          },
        },
      },
    });
    return { request: created, queueNumber: queue };
  });

  await prisma.notification.create({
    data: {
      title: "طلب موعد جديد",
      body: `طلب جديد من ${input.fullName}${input.phone?.trim() ? ` — ${input.phone.trim()}` : ""}`,
      type: "APPOINTMENT_REQUEST",
      channel: "IN_APP",
      status: "PENDING",
      entityType: "AppointmentRequest",
      entityId: request.id,
    },
  });

  await publishEvent("clinic:appointments", {
    type: "NEW_REQUEST",
    requestId: request.id,
  });

  return { ...request, queueNumber };
}

/** تحديث بيانات طلب الاستقبال قبل التوجيه */
export async function updateReceptionRequestInfo(params: {
  requestId: string;
  userId: string;
  roleCode: string;
  userName: string;
  fullName?: string;
  phone?: string;
  age?: number | null;
  city?: string | null;
  chronicIllnesses?: string | null;
  appointmentType?: AppointmentType;
  reason?: string | null;
  isFirstVisit?: boolean;
}) {
  const existing = await prisma.appointmentRequest.findUnique({
    where: { id: params.requestId },
  });
  if (!existing) throw new Error("الطلب غير موجود");
  if (existing.appointmentId) {
    throw new Error("تم توجيه هذا الطلب — عدّل ملف المريض من القائمة");
  }
  if (
    !["NEW_REQUEST", "EMERGENCY", "UNDER_SECRETARY_REVIEW"].includes(
      existing.status,
    )
  ) {
    throw new Error("لا يمكن تعديل هذا الطلب الآن");
  }

  const fullName = params.fullName?.trim();
  const phone = params.phone?.trim();
  if (fullName !== undefined && fullName.length < 2) {
    throw new Error("الاسم غير صالح");
  }
  if (phone !== undefined && phone.length > 0 && phone.length < 8) {
    throw new Error("رقم الهاتف غير صالح");
  }

  const nextType = params.appointmentType ?? existing.appointmentType;
  const service = await prisma.service.findUnique({
    where: { code: nextType },
  });
  const nextReason =
    params.reason !== undefined
      ? params.reason?.trim() || service?.nameAr || existing.reason
      : existing.reason;

  if (nextType === "OTHER") {
    const custom = nextReason?.trim();
    if (!custom || custom.length < 2) {
      throw new Error("اكتب سبب الزيارة عند اختيار «أخرى»");
    }
  }

  const updated = await prisma.appointmentRequest.update({
    where: { id: params.requestId },
    data: {
      fullName: fullName || existing.fullName,
      phone: phone !== undefined ? phone : existing.phone,
      age:
        params.age === null
          ? null
          : params.age !== undefined
            ? params.age
            : existing.age,
      city:
        params.city === null
          ? null
          : params.city !== undefined
            ? params.city.trim() || null
            : existing.city,
      chronicIllnesses:
        params.chronicIllnesses === null
          ? null
          : params.chronicIllnesses !== undefined
            ? params.chronicIllnesses.trim() || null
            : existing.chronicIllnesses,
      appointmentType: nextType,
      serviceId: service?.id ?? existing.serviceId,
      reason: nextReason,
      isEmergency: nextType === "EMERGENCY" || existing.isEmergency,
      isPreviousPatient:
        params.isFirstVisit !== undefined
          ? !params.isFirstVisit
          : existing.isPreviousPatient,
      status:
        existing.status === "NEW_REQUEST"
          ? nextType === "EMERGENCY"
            ? "EMERGENCY"
            : "UNDER_SECRETARY_REVIEW"
          : nextType === "EMERGENCY" && existing.status !== "EMERGENCY"
            ? "EMERGENCY"
            : existing.status,
      statusHistory: {
        create: {
          previousStatus: existing.status,
          newStatus:
            existing.status === "NEW_REQUEST"
              ? nextType === "EMERGENCY"
                ? "EMERGENCY"
                : "UNDER_SECRETARY_REVIEW"
              : existing.status,
          changedById: params.userId,
          reason: `تحديث بيانات الاستقبال بواسطة ${params.userName}`,
        },
      },
    },
  });

  await createAuditLog({
    userId: params.userId,
    roleCode: params.roleCode,
    action: "RECEPTION_REQUEST_UPDATED",
    entityType: "AppointmentRequest",
    entityId: params.requestId,
    oldValue: {
      fullName: existing.fullName,
      phone: existing.phone,
      city: existing.city,
      chronicIllnesses: existing.chronicIllnesses,
      appointmentType: existing.appointmentType,
    },
    newValue: {
      fullName: updated.fullName,
      phone: updated.phone,
      city: updated.city,
      chronicIllnesses: updated.chronicIllnesses,
      appointmentType: updated.appointmentType,
      isPreviousPatient: updated.isPreviousPatient,
    },
    reason: `تحديث بيانات الاستقبال بواسطة ${params.userName}`,
  });

  return updated;
}

export async function changeAppointmentRequestStatus(params: {
  requestId: string;
  newStatus: AppointmentStatus;
  userId: string;
  roleCode: string;
  reason?: string;
  note?: string;
  assignedDoctorId?: string;
}) {
  const existing = await prisma.appointmentRequest.findUnique({
    where: { id: params.requestId },
  });
  if (!existing) throw new Error("الطلب غير موجود");

  const updated = await prisma.appointmentRequest.update({
    where: { id: params.requestId },
    data: {
      status: params.newStatus,
      assignedDoctorId: params.assignedDoctorId ?? existing.assignedDoctorId,
      secretaryNotes: params.note ?? existing.secretaryNotes,
      statusHistory: {
        create: {
          previousStatus: existing.status,
          newStatus: params.newStatus,
          changedById: params.userId,
          reason: params.reason,
          note: params.note,
        },
      },
    },
  });

  await createAuditLog({
    userId: params.userId,
    roleCode: params.roleCode,
    action: "APPOINTMENT_REQUEST_STATUS_CHANGE",
    entityType: "AppointmentRequest",
    entityId: params.requestId,
    oldValue: { status: existing.status },
    newValue: { status: params.newStatus, assignedDoctorId: params.assignedDoctorId },
    reason: params.reason,
  });

  await publishEvent("clinic:appointments", {
    type: "STATUS_CHANGE",
    requestId: params.requestId,
    status: params.newStatus,
  });

  return updated;
}

export async function confirmAppointmentFromRequest(params: {
  requestId: string;
  doctorId: string;
  startAt: Date;
  durationMinutes?: number;
  userId: string;
  roleCode: string;
  userName: string;
}) {
  const request = await prisma.appointmentRequest.findUnique({
    where: { id: params.requestId },
  });
  if (!request) throw new Error("الطلب غير موجود");

  const duration = params.durationMinutes ?? 30;
  const endAt = new Date(params.startAt.getTime() + duration * 60_000);
  const availability = await isDoctorAvailable({
    doctorId: params.doctorId,
    startAt: params.startAt,
    endAt,
  });
  if (!availability.ok) {
    throw new Error(availability.reason);
  }

  let patient = await prisma.patient.findFirst({
    where: { phone: request.phone, deletedAt: null },
  });

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        patientNumber: generateNumber("PAT"),
        fullName: request.fullName,
        phone: request.phone,
        age: request.age ?? undefined,
        dateOfBirth: request.dateOfBirth ?? undefined,
        gender: request.gender ?? undefined,
        city: request.city ?? undefined,
      },
    });
  }

  const appointment = await prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
      data: {
        appointmentNumber: generateNumber("APT"),
        patientId: patient!.id,
        doctorId: params.doctorId,
        serviceId: request.serviceId ?? undefined,
        appointmentType: request.appointmentType,
        status: "CONFIRMED",
        startAt: params.startAt,
        endAt,
        durationMinutes: duration,
        isEmergency: request.isEmergency,
        createdById: params.userId,
        notes: request.additionalNotes ?? undefined,
        statusHistory: {
          create: {
            previousStatus: request.status,
            newStatus: "CONFIRMED",
            changedById: params.userId,
            reason: `تم تأكيد الموعد بواسطة ${params.userName}`,
          },
        },
      },
    });

    await tx.appointmentRequest.update({
      where: { id: request.id },
      data: {
        status: "CONFIRMED",
        assignedDoctorId: params.doctorId,
        patientId: patient!.id,
        appointmentId: created.id,
        statusHistory: {
          create: {
            previousStatus: request.status,
            newStatus: "CONFIRMED",
            changedById: params.userId,
            reason: `تم تأكيد الموعد بواسطة ${params.userName}`,
          },
        },
      },
    });

    return created;
  });

  await createAuditLog({
    userId: params.userId,
    roleCode: params.roleCode,
    action: "APPOINTMENT_CONFIRMED",
    entityType: "Appointment",
    entityId: appointment.id,
    newValue: appointment,
    reason: `تم تأكيد الموعد بواسطة ${params.userName}`,
  });

  return appointment;
}

/** توجيه المريض للطبيب بدون تحديد وقت — الدفع لاحقًا بعد الحصة */
export async function directPatientFromRequest(params: {
  requestId: string;
  doctorId: string;
  userId: string;
  roleCode: string;
  userName: string;
  note?: string;
}) {
  const request = await prisma.appointmentRequest.findUnique({
    where: { id: params.requestId },
  });
  if (!request) throw new Error("الطلب غير موجود");
  if (!params.doctorId) throw new Error("يرجى اختيار الطبيب");
  if (request.appointmentId) {
    throw new Error("تم توجيه هذا المريض مسبقًا");
  }

  let patient = null as Awaited<
    ReturnType<typeof prisma.patient.findFirst>
  >;
  const phoneRaw = (request.phone || "").trim();
  const phoneUsable =
    phoneRaw.length >= 8 &&
    phoneRaw !== "غير محدد" &&
    !phoneRaw.startsWith("بدون-");

  if (phoneUsable) {
    patient = await prisma.patient.findFirst({
      where: { phone: phoneRaw, deletedAt: null },
    });
  }

  const receptionBits = [
    request.reason ? `سبب الزيارة: ${request.reason}` : null,
    request.city ? `السكن: ${request.city}` : null,
    request.chronicIllnesses
      ? `مرض يعاني منه: ${request.chronicIllnesses}`
      : null,
    request.isPreviousPatient === false
      ? "أول زيارة"
      : request.isPreviousPatient
        ? "مريض سابق"
        : null,
    request.age != null ? `العمر: ${request.age}` : null,
  ].filter(Boolean);

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        patientNumber: generateNumber("PAT"),
        fullName: request.fullName,
        phone: phoneUsable ? phoneRaw : `بدون-${Date.now().toString().slice(-8)}`,
        age: request.age ?? undefined,
        dateOfBirth: request.dateOfBirth ?? undefined,
        gender: request.gender ?? undefined,
        city: request.city ?? undefined,
        chronicIllnesses: request.chronicIllnesses ?? undefined,
        notes: receptionBits.length
          ? `معلومات الاستقبال — ${receptionBits.join(" · ")}`
          : undefined,
      },
    });
  } else {
    // حدّث بيانات الاستقبال إن توفّرت
    const prevNotes = patient.notes?.trim() || "";
    const receptionLine = receptionBits.length
      ? `معلومات الاستقبال — ${receptionBits.join(" · ")}`
      : "";
    patient = await prisma.patient.update({
      where: { id: patient.id },
      data: {
        fullName: request.fullName || patient.fullName,
        age: request.age ?? patient.age,
        city: request.city?.trim() || patient.city,
        chronicIllnesses:
          request.chronicIllnesses?.trim() || patient.chronicIllnesses,
        notes: receptionLine
          ? prevNotes && !prevNotes.includes("معلومات الاستقبال")
            ? `${receptionLine}\n${prevNotes}`
            : receptionLine
          : patient.notes,
      },
    });
  }

  // سجل طبي مختصر للمرض المزمن من الاستقبال
  if (request.chronicIllnesses?.trim()) {
    await prisma.medicalHistory.upsert({
      where: { patientId: patient.id },
      update: {
        systemicDiseases: request.chronicIllnesses.trim(),
      },
      create: {
        patientId: patient.id,
        systemicDiseases: request.chronicIllnesses.trim(),
      },
    });
  }

  const now = new Date();
  const duration = 30;
  const endAt = new Date(now.getTime() + duration * 60_000);
  const note = [
    `تم التوجيه بواسطة ${params.userName}`,
    ...receptionBits,
    params.note?.trim() || null,
  ]
    .filter(Boolean)
    .join(" — ");

  const wrNote = receptionBits.join(" · ") || params.note || null;

  const result = await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.create({
      data: {
        appointmentNumber: generateNumber("APT"),
        patientId: patient!.id,
        doctorId: params.doctorId,
        serviceId: request.serviceId ?? undefined,
        appointmentType: request.appointmentType,
        status: "WAITING_ROOM",
        startAt: now,
        endAt,
        durationMinutes: duration,
        isEmergency: request.isEmergency,
        createdById: params.userId,
        notes: note,
        statusHistory: {
          create: {
            previousStatus: request.status,
            newStatus: "WAITING_ROOM",
            changedById: params.userId,
            reason: `تم توجيه المريض بواسطة ${params.userName}`,
            note: params.note,
          },
        },
      },
    });

    await tx.appointmentRequest.update({
      where: { id: request.id },
      data: {
        status: "WAITING_ROOM",
        assignedDoctorId: params.doctorId,
        patientId: patient!.id,
        appointmentId: appointment.id,
        secretaryNotes: [request.secretaryNotes, note].filter(Boolean).join("\n"),
        statusHistory: {
          create: {
            previousStatus: request.status,
            newStatus: "WAITING_ROOM",
            changedById: params.userId,
            reason: `تم توجيه المريض بواسطة ${params.userName}`,
            note: params.note,
          },
        },
      },
    });

    await tx.waitingRoomEntry.create({
      data: {
        appointmentId: appointment.id,
        patientId: patient!.id,
        doctorId: params.doctorId,
        status: "WAITING",
        urgency: request.isEmergency,
        note: wrNote,
      },
    });

    return { appointment, patient };
  });

  await createAuditLog({
    userId: params.userId,
    roleCode: params.roleCode,
    action: "PATIENT_DIRECTED",
    entityType: "Appointment",
    entityId: result.appointment.id,
    newValue: { doctorId: params.doctorId },
    reason: `تم توجيه المريض بواسطة ${params.userName}`,
  });

  await publishEvent("clinic:waiting-room", {
    type: "PATIENT_DIRECTED",
    appointmentId: result.appointment.id,
  });

  return result;
}

/** إدخال مريض لديه موعد مجدول (حساب) إلى قاعة الانتظار عند حلول الوقت */
export async function checkInScheduledAppointment(params: {
  appointmentId: string;
  userId: string;
  roleCode: string;
  userName: string;
  doctorId?: string;
}) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: params.appointmentId },
    include: {
      patient: { include: { account: true } },
      waitingRoomEntry: true,
    },
  });
  if (!appointment || appointment.deletedAt) {
    throw new Error("الموعد غير موجود");
  }
  if (appointment.waitingRoomEntry && !["LEFT"].includes(appointment.waitingRoomEntry.status)) {
    throw new Error("المريض موجود في الانتظار مسبقًا");
  }
  if (
    ["COMPLETED", "CANCELLED_BY_CLINIC", "CANCELLED_BY_PATIENT", "NO_SHOW", "IN_TREATMENT"].includes(
      appointment.status,
    )
  ) {
    throw new Error("لا يمكن إدخال هذا الموعد");
  }

  // لا تُدخل مريضاً لديه حضور فعّال في العيادة على موعد آخر
  const { start: dayStart } = await import("@/lib/daily-queue").then((m) =>
    m.algiersDayBounds(),
  );
  const busy = await prisma.waitingRoomEntry.findFirst({
    where: {
      patientId: appointment.patientId,
      status: { in: ["ARRIVED", "WAITING", "WITH_DOCTOR", "SESSION_DONE"] },
      arrivedAt: { gte: dayStart },
    },
  });
  if (busy) {
    throw new Error(
      "المريض موجود أصلاً في التوجيه/العيادة — لا حاجة لإدخاله من مواعيد اليوم",
    );
  }

  const doctorId = params.doctorId || appointment.doctorId;
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        doctorId,
        status: "WAITING_ROOM",
        statusHistory: {
          create: {
            previousStatus: appointment.status,
            newStatus: "WAITING_ROOM",
            changedById: params.userId,
            reason: `وصول موعد مجدول — إدخال بواسطة ${params.userName}`,
          },
        },
      },
    });

    const entry = appointment.waitingRoomEntry
      ? await tx.waitingRoomEntry.update({
          where: { id: appointment.waitingRoomEntry.id },
          data: {
            doctorId,
            status: "WAITING",
            arrivedAt: now,
            urgency: appointment.isEmergency,
            note: "موعد مجدول — إدخال من السكرتارية",
          },
        })
      : await tx.waitingRoomEntry.create({
          data: {
            appointmentId: appointment.id,
            patientId: appointment.patientId,
            doctorId,
            status: "WAITING",
            arrivedAt: now,
            urgency: appointment.isEmergency,
            note: "موعد مجدول — إدخال من السكرتارية",
          },
        });

    return { appointment: updated, entry };
  });

  await createAuditLog({
    userId: params.userId,
    roleCode: params.roleCode,
    action: "SCHEDULED_APPOINTMENT_CHECKED_IN",
    entityType: "Appointment",
    entityId: appointment.id,
    reason: `إدخال موعد مجدول بواسطة ${params.userName}`,
  });

  await publishEvent("clinic:waiting-room", {
    type: "SCHEDULED_CHECK_IN",
    appointmentId: appointment.id,
  });

  return result;
}

/** حذف/إلغاء مريض من الاستقبال قبل دخول الطبيب */
export async function removePatientBeforeDoctor(params: {
  requestId?: string;
  waitingEntryId?: string;
  userId: string;
  roleCode: string;
  userName: string;
}) {
  if (params.waitingEntryId) {
    const entry = await prisma.waitingRoomEntry.findUnique({
      where: { id: params.waitingEntryId },
      include: { appointment: { include: { request: true } } },
    });
    if (!entry) throw new Error("السجل غير موجود");
    if (entry.status === "WITH_DOCTOR") {
      throw new Error("المريض عند الطبيب — لا يمكن الحذف");
    }
    if (entry.status === "SESSION_DONE") {
      throw new Error("انتهت المعاينة — استخدم الدفع أو المسار المعتاد");
    }

    await prisma.$transaction(async (tx) => {
      await tx.waitingRoomEntry.update({
        where: { id: entry.id },
        data: { status: "LEFT", completedAt: new Date(), note: "حُذف قبل دخول الطبيب" },
      });
      await tx.appointment.update({
        where: { id: entry.appointmentId },
        data: {
          status: "CANCELLED_BY_CLINIC",
          deletedAt: new Date(),
          statusHistory: {
            create: {
              previousStatus: entry.appointment.status,
              newStatus: "CANCELLED_BY_CLINIC",
              changedById: params.userId,
              reason: `حذف من الانتظار بواسطة ${params.userName} — لم يدخل الطبيب`,
            },
          },
        },
      });
      if (entry.appointment.request) {
        await tx.appointmentRequest.update({
          where: { id: entry.appointment.request.id },
          data: {
            status: "CANCELLED_BY_CLINIC",
            statusHistory: {
              create: {
                previousStatus: entry.appointment.request.status,
                newStatus: "CANCELLED_BY_CLINIC",
                changedById: params.userId,
                reason: `حذف قبل دخول الطبيب بواسطة ${params.userName}`,
              },
            },
          },
        });
      }
    });

    await createAuditLog({
      userId: params.userId,
      roleCode: params.roleCode,
      action: "PATIENT_REMOVED_BEFORE_DOCTOR",
      entityType: "WaitingRoomEntry",
      entityId: entry.id,
      reason: `حذف مريض لم يدخل الطبيب بواسطة ${params.userName}`,
    });
    await publishEvent("clinic:waiting-room", {
      type: "REMOVED",
      id: entry.id,
    });
    return { ok: true };
  }

  if (params.requestId) {
    const request = await prisma.appointmentRequest.findUnique({
      where: { id: params.requestId },
      include: { appointment: { include: { waitingRoomEntry: true } } },
    });
    if (!request) throw new Error("الطلب غير موجود");

    // إن وُجّه وبانتظار الطبيب — نحذف من الانتظار
    const waiting = request.appointment?.waitingRoomEntry;
    if (waiting && ["ARRIVED", "WAITING"].includes(waiting.status)) {
      return removePatientBeforeDoctor({
        waitingEntryId: waiting.id,
        userId: params.userId,
        roleCode: params.roleCode,
        userName: params.userName,
      });
    }

    if (waiting && waiting.status === "WITH_DOCTOR") {
      throw new Error("المريض عند الطبيب — لا يمكن الحذف");
    }

    if (
      !["NEW_REQUEST", "EMERGENCY", "UNDER_SECRETARY_REVIEW"].includes(
        request.status,
      )
    ) {
      throw new Error("لا يمكن حذف هذا الطلب في حالته الحالية");
    }

    await changeAppointmentRequestStatus({
      requestId: request.id,
      newStatus: "CANCELLED_BY_CLINIC",
      userId: params.userId,
      roleCode: params.roleCode,
      reason: `حذف من الاستقبال بواسطة ${params.userName} — لم يدخل الطبيب`,
    });

    await createAuditLog({
      userId: params.userId,
      roleCode: params.roleCode,
      action: "RECEPTION_REQUEST_REMOVED",
      entityType: "AppointmentRequest",
      entityId: request.id,
      reason: `حذف تسجيل قبل التوجيه بواسطة ${params.userName}`,
    });
    return { ok: true };
  }

  throw new Error("معرّف مطلوب");
}

export async function getDashboardStats(scope: {
  doctorId?: string;
  today?: Date;
}) {
  const start = scope.today ? new Date(scope.today) : new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  const doctorFilter: Prisma.AppointmentWhereInput = scope.doctorId
    ? { doctorId: scope.doctorId }
    : {};

  const [
    appointmentsToday,
    newRequests,
    confirmed,
    waitingRoom,
    emergencies,
    noShows,
    pendingApproval,
    unpaid,
  ] = await Promise.all([
    prisma.appointment.count({
      where: {
        ...doctorFilter,
        startAt: { gte: start, lte: end },
        deletedAt: null,
      },
    }),
    prisma.appointmentRequest.count({
      where: { status: { in: ["NEW_REQUEST", "EMERGENCY"] } },
    }),
    prisma.appointment.count({
      where: {
        ...doctorFilter,
        status: "CONFIRMED",
        startAt: { gte: start, lte: end },
        deletedAt: null,
      },
    }),
    prisma.waitingRoomEntry.count({
      where: {
        ...(scope.doctorId ? { doctorId: scope.doctorId } : {}),
        status: { in: ["ARRIVED", "WAITING"] },
      },
    }),
    prisma.appointment.count({
      where: {
        ...doctorFilter,
        isEmergency: true,
        startAt: { gte: start, lte: end },
        deletedAt: null,
      },
    }),
    prisma.appointment.count({
      where: {
        ...doctorFilter,
        status: "NO_SHOW",
        startAt: { gte: start, lte: end },
      },
    }),
    prisma.appointmentRequest.count({
      where: { status: "WAITING_DOCTOR_APPROVAL" },
    }),
    prisma.invoice.aggregate({
      _sum: { remainingAmount: true },
      where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
    }),
  ]);

  return {
    appointmentsToday,
    newRequests,
    confirmed,
    waitingRoom,
    emergencies,
    noShows,
    pendingApproval,
    unpaidBalances: Number(unpaid._sum.remainingAmount || 0),
  };
}
