import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";
import { hashPassword } from "@/lib/auth/password";
import { generateNumber } from "@/lib/utils";
import { generateQrAccessToken, getAppOrigin, patientQrLoginUrl } from "@/lib/patient-qr";

function generateReadablePassword() {
  const part = randomBytes(3).toString("hex");
  return `Wisam-${part}`;
}

function requestOrigin(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (proto && host) return `${proto.split(",")[0]!.trim()}://${host.split(",")[0]!.trim()}`;
  try {
    return new URL(req.url).origin;
  } catch {
    return null;
  }
}

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
  const nextSessionDays = Number(body.nextSessionDays || 14);
  if (!patientId) {
    return NextResponse.json({ error: "معرّف المريض مطلوب" }, { status: 400 });
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { account: true },
  });
  if (!patient) {
    return NextResponse.json({ error: "المريض غير موجود" }, { status: 404 });
  }
  if (patient.account?.status === "ACTIVE") {
    return NextResponse.json({ error: "الحساب موجود مسبقًا" }, { status: 409 });
  }

  const doctor = await prisma.doctor.findFirst({
    where: { userId: user.id, type: "SPECIALIST", isActive: true },
  });
  if (!doctor) {
    return NextResponse.json({ error: "ملف الطبيب غير موجود" }, { status: 400 });
  }

  const role = await prisma.role.findUnique({ where: { code: "PATIENT" } });
  if (!role) {
    return NextResponse.json({ error: "دور المريض غير موجود" }, { status: 500 });
  }

  const plainPassword = generateReadablePassword();
  const passwordHash = await hashPassword(plainPassword);

  // إعادة تفعيل حساب معطّل سابقًا
  if (patient.account) {
    const qrAccessToken =
      // احتفظ بالرمز إن وُجد وإلا أنشئ جديداً
      (await prisma.patientAccount.findUnique({ where: { id: patient.account.id } }))
        ?.qrAccessToken || generateQrAccessToken();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: patient.account.userId },
        data: { status: "ACTIVE", passwordHash },
      }),
      prisma.patientAccount.update({
        where: { id: patient.account.id },
        data: {
          status: "ACTIVE",
          activatedAt: new Date(),
          activatedById: user.id,
          qrAccessToken,
        },
      }),
    ]);
    const loginUser = await prisma.user.findUnique({
      where: { id: patient.account.userId },
    });
    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "PATIENT_ACCOUNT_REACTIVATED",
      entityType: "PatientAccount",
      entityId: patient.account.id,
      reason: `إعادة تفعيل حساب مريض بواسطة ${user.fullName}`,
    });
    return NextResponse.json({
      ok: true,
      credentials: {
        login: loginUser?.email || loginUser?.phone || "",
        password: plainPassword,
      },
      qrAccessToken,
      qrUrl: patientQrLoginUrl(qrAccessToken, getAppOrigin(requestOrigin(req))),
    });
  }

  // Login identifier: use phone if usable, else generated email
  const loginPhone =
    patient.phone && patient.phone !== "غير محدد" && !patient.phone.includes("-acc")
      ? patient.phone
      : null;
  const loginEmail =
    patient.email ||
    `patient.${patient.patientNumber.toLowerCase().replace(/[^a-z0-9]/gi, "")}@alwisam.dz`;

  // Ensure unique phone/email
  let phoneToUse = loginPhone;
  if (phoneToUse) {
    const exists = await prisma.user.findFirst({ where: { phone: phoneToUse } });
    if (exists) phoneToUse = `${phoneToUse}-${Date.now().toString().slice(-4)}`;
  }

  const nextAt = new Date();
  nextAt.setDate(nextAt.getDate() + Math.max(1, nextSessionDays));
  nextAt.setHours(10, 0, 0, 0);
  const endAt = new Date(nextAt.getTime() + 30 * 60_000);
  const qrAccessToken = generateQrAccessToken();

  const result = await prisma.$transaction(async (tx) => {
    const patientUser = await tx.user.create({
      data: {
        fullName: patient.fullName,
        phone: phoneToUse || undefined,
        email: loginEmail,
        passwordHash,
        roleId: role.id,
        status: "ACTIVE",
      },
    });

    const account = await tx.patientAccount.create({
      data: {
        patientId,
        userId: patientUser.id,
        status: "ACTIVE",
        activatedAt: new Date(),
        activatedById: user.id,
        requestedById: user.id,
        qrAccessToken,
      },
    });

    await tx.patient.update({
      where: { id: patientId },
      data: {
        patientType: "LONG_TERM",
        primaryDoctorId: doctor.id,
        email: patient.email || loginEmail,
      },
    });

    const appointment = await tx.appointment.create({
      data: {
        appointmentNumber: generateNumber("APT"),
        patientId,
        doctorId: doctor.id,
        appointmentType: "ORTHO_FOLLOWUP",
        status: "CONFIRMED",
        startAt: nextAt,
        endAt,
        durationMinutes: 30,
        createdById: user.id,
        notes: `موعد متابعة تقويم — أُنشئ مع الحساب بواسطة ${user.fullName}`,
        statusHistory: {
          create: {
            newStatus: "CONFIRMED",
            changedById: user.id,
            reason: `موعد قادم عند إنشاء الحساب بواسطة ${user.fullName}`,
          },
        },
      },
    });

    await tx.orthodonticCase.create({
      data: {
        patientId,
        doctorId: doctor.id,
        diagnosis: "بدء متابعة التقويم",
        status: "IN_PROGRESS",
        startDate: new Date(),
        nextAppointment: nextAt,
        sessionFrequency: "BIWEEKLY",
        notes: `حساب مفعّل مباشرة بواسطة ${user.fullName}`,
      },
    });

    return { patientUser, account, appointment };
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "PATIENT_ACCOUNT_CREATED_ACTIVE",
    entityType: "Patient",
    entityId: patientId,
    reason: `إنشاء حساب مفعّل مع موعد قادم بواسطة ${user.fullName}`,
  });

  return NextResponse.json({
    ok: true,
    message: "تم إنشاء حساب المريض مباشرة مع موعد قادم",
    patientName: patient.fullName,
    credentials: {
      login: phoneToUse || loginEmail,
      email: loginEmail,
      phone: phoneToUse,
      password: plainPassword,
    },
    qrAccessToken,
    qrUrl: patientQrLoginUrl(qrAccessToken, getAppOrigin(requestOrigin(req))),
    nextAppointment: {
      id: result.appointment.id,
      startAt: result.appointment.startAt.toISOString(),
    },
  });
}
