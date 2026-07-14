import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";
import { generateNumber } from "@/lib/utils";
import { hashPassword } from "@/lib/auth/password";

const coverageAr: Record<string, string> = {
  SESSION_FEE: "دفع مبلغ الحصة",
  COVERED_SURGERY: "تابع لمصاريف العملية",
  COVERED_ORTHODONTICS: "تابع لمصاريف التقويم",
  COVERED_TREATMENT: "تابع لخطة العلاج",
  COVERED_OTHER: "مغطى ضمن تكاليف أخرى",
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["SECRETARY", "ADMIN"].includes(user.role.code)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const entryId = String(body.entryId || "");
  const appointmentId = String(body.appointmentId || "");
  const patientId = String(body.patientId || "");
  const coverage = String(body.coverage || "");
  const note = String(body.note || "");
  const requestOrthoAccount = !!body.requestOrthoAccount;

  if (!entryId || !appointmentId || !patientId || !coverageAr[coverage]) {
    return NextResponse.json({ error: "بيانات غير مكتملة" }, { status: 400 });
  }

  if (coverage === "SESSION_FEE" && (!body.amount || Number(body.amount) <= 0)) {
    return NextResponse.json({ error: "أدخل مبلغ الحصة" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctor: true, patient: { include: { account: true } } },
  });
  if (!appointment) {
    return NextResponse.json({ error: "الموعد غير موجود" }, { status: 404 });
  }

  const coverageLabel = coverageAr[coverage];
  let activationHint = "";

  await prisma.$transaction(async (tx) => {
    if (coverage === "SESSION_FEE") {
      const amount = new Prisma.Decimal(Number(body.amount));
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: generateNumber("INV"),
          patientId,
          appointmentId,
          doctorId: appointment.doctorId,
          totalAmount: amount,
          paidAmount: amount,
          remainingAmount: new Prisma.Decimal(0),
          status: "PAID",
          notes: `مبلغ حصة بعد الزيارة — ${user.fullName}`,
          createdById: user.id,
        },
      });
      await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount,
          method: body.method || "CASH",
          receiptNumber: generateNumber("RCP"),
          createdById: user.id,
          notes: `استلام بعد الخروج من الطبيب بواسطة ${user.fullName}`,
        },
      });
    }

    await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "COMPLETED",
        notes: [appointment.notes, `بعد الزيارة: ${coverageLabel}`, note || null]
          .filter(Boolean)
          .join(" — "),
        statusHistory: {
          create: {
            previousStatus: appointment.status,
            newStatus: "COMPLETED",
            changedById: user.id,
            reason: `إنهاء الزيارة بواسطة ${user.fullName} — ${coverageLabel}`,
            note,
          },
        },
      },
    });

    await tx.waitingRoomEntry.update({
      where: { id: entryId },
      data: {
        status: "LEFT",
        completedAt: new Date(),
        note: coverageLabel,
      },
    });

    // First session with specialist: create pending patient account + ortho approval request
    if (
      requestOrthoAccount &&
      appointment.doctor.type === "SPECIALIST" &&
      !appointment.patient.account
    ) {
      const role = await tx.role.findUnique({ where: { code: "PATIENT" } });
      if (role) {
        const tempPassword = await hashPassword(randomBytes(12).toString("hex"));
        const phone =
          appointment.patient.phone && appointment.patient.phone !== "غير محدد"
            ? `${appointment.patient.phone}-pending-${Date.now()}`
            : `pending-${Date.now()}`;

        const patientUser = await tx.user.create({
          data: {
            fullName: appointment.patient.fullName,
            phone,
            email: appointment.patient.email || undefined,
            passwordHash: tempPassword,
            roleId: role.id,
            status: "PENDING",
          },
        });

        await tx.patientAccount.create({
          data: {
            patientId,
            userId: patientUser.id,
            status: "PENDING",
            requestedById: user.id,
          },
        });

        await tx.patient.update({
          where: { id: patientId },
          data: {
            patientType: "LONG_TERM",
            primaryDoctorId: appointment.doctorId,
          },
        });

        const token = randomBytes(24).toString("hex");
        const tokenHash = createHash("sha256").update(token).digest("hex");
        await tx.activationToken.create({
          data: {
            userId: patientUser.id,
            tokenHash,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        await tx.orthodonticCase.create({
          data: {
            patientId,
            doctorId: appointment.doctorId,
            diagnosis: "بانتظار موافقة بدء التقويم",
            status: "NOT_STARTED",
            notes: `طلب موافقة بدء التقويم من السكرتارية ${user.fullName} بعد أول جلسة`,
          },
        });

        await tx.notification.create({
          data: {
            title: "موافقة بدء تقويم مطلوبة",
            body: `المريض ${appointment.patient.fullName} بانتظار موافقة الدكتور منانة فؤاد لبدء التقويم وتفعيل الحساب`,
            type: "ORTHO_APPROVAL_REQUEST",
            channel: "IN_APP",
            status: "PENDING",
            entityType: "Patient",
            entityId: patientId,
          },
        });

        activationHint =
          " وتم إنشاء طلب حساب + موافقة بدء التقويم للدكتور منانة فؤاد";
      }
    }
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "POST_VISIT_CHECKOUT",
    entityType: "Appointment",
    entityId: appointmentId,
    newValue: { coverage, amount: body.amount ?? null, requestOrthoAccount },
    reason: `بعد الزيارة بواسطة ${user.fullName} — ${coverageLabel}`,
  });

  return NextResponse.json({
    ok: true,
    message: `تم إنهاء الزيارة — ${coverageLabel}${activationHint}`,
  });
}
