import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";
import { hashPassword } from "@/lib/auth/password";

function isOwner(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  return ["DOCTOR_SPECIALIST", "ADMIN"].includes(user.role.code);
}

/** تعديل معلومات المريض أو حسابه */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isOwner(user)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const patientId = String(body.patientId || "");
  const section = String(body.section || "info");
  if (!patientId) {
    return NextResponse.json({ error: "معرّف المريض مطلوب" }, { status: 400 });
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { account: { include: { user: true } } },
  });
  if (!patient || patient.deletedAt) {
    return NextResponse.json({ error: "المريض غير موجود" }, { status: 404 });
  }

  if (section === "info") {
    const fullName = String(body.fullName || patient.fullName).trim();
    const phone = String(body.phone ?? patient.phone).trim();
    const email =
      body.email !== undefined
        ? String(body.email).trim() || null
        : patient.email;
    const age =
      body.age !== undefined && body.age !== ""
        ? Number(body.age)
        : patient.age;
    const city =
      body.city !== undefined ? String(body.city).trim() || null : patient.city;
    const allergies =
      body.allergies !== undefined
        ? String(body.allergies).trim() || null
        : patient.allergies;
    const notes =
      body.notes !== undefined
        ? String(body.notes).trim() || null
        : patient.notes;

    await prisma.patient.update({
      where: { id: patientId },
      data: {
        fullName,
        phone: phone || patient.phone,
        email,
        age: Number.isFinite(age as number) ? (age as number) : null,
        city,
        allergies,
        notes,
      },
    });

    if (patient.account?.userId) {
      await prisma.user.update({
        where: { id: patient.account.userId },
        data: { fullName },
      });
    }

    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "PATIENT_INFO_UPDATED",
      entityType: "Patient",
      entityId: patientId,
      reason: `تعديل معلومات مريض بواسطة ${user.fullName}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (section === "account") {
    if (!patient.account) {
      return NextResponse.json({ error: "لا يوجد حساب" }, { status: 404 });
    }
    const loginEmail =
      body.email !== undefined
        ? String(body.email).trim()
        : patient.account.user.email;
    const loginPhone =
      body.phone !== undefined
        ? String(body.phone).trim()
        : patient.account.user.phone;
    const newPassword = String(body.newPassword || "");

    const data: { email?: string | null; phone?: string | null; passwordHash?: string } =
      {};
    if (body.email !== undefined) data.email = loginEmail || null;
    if (body.phone !== undefined) data.phone = loginPhone || null;
    if (newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "كلمة السر 8 أحرف على الأقل" },
          { status: 400 },
        );
      }
      data.passwordHash = await hashPassword(newPassword);
    }

    await prisma.user.update({
      where: { id: patient.account.userId },
      data,
    });

    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "PATIENT_ACCOUNT_UPDATED",
      entityType: "PatientAccount",
      entityId: patient.account.id,
      reason: `تعديل حساب مريض بواسطة ${user.fullName}`,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "قسم غير معروف" }, { status: 400 });
}

/**
 * حذف:
 * - scope=account → تعطيل حساب الدخول فقط
 * - scope=patient → حذف المريض من القائمة (soft delete) + تعطيل الحساب إن وُجد
 */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isOwner(user)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const patientId = String(body.patientId || "");
  const scope = String(body.scope || "account");
  if (!patientId) {
    return NextResponse.json({ error: "معرّف المريض مطلوب" }, { status: 400 });
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { account: true },
  });
  if (!patient || patient.deletedAt) {
    return NextResponse.json({ error: "المريض غير موجود" }, { status: 404 });
  }

  if (scope === "patient") {
    await prisma.$transaction(async (tx) => {
      if (patient.account) {
        await tx.user.update({
          where: { id: patient.account.userId },
          data: { status: "INACTIVE" },
        });
        await tx.patientAccount.update({
          where: { id: patient.account.id },
          data: { status: "INACTIVE" },
        });
      }
      await tx.patient.update({
        where: { id: patientId },
        data: { deletedAt: new Date() },
      });
    });

    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "PATIENT_SOFT_DELETED",
      entityType: "Patient",
      entityId: patientId,
      reason: `حذف مريض من القائمة بواسطة ${user.fullName}`,
    });

    return NextResponse.json({ ok: true, scope: "patient" });
  }

  if (!patient.account) {
    return NextResponse.json({ error: "لا يوجد حساب لحذفه" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: patient.account.userId },
      data: { status: "INACTIVE" },
    }),
    prisma.patientAccount.update({
      where: { id: patient.account.id },
      data: { status: "INACTIVE" },
    }),
  ]);

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "PATIENT_ACCOUNT_DELETED",
    entityType: "PatientAccount",
    entityId: patient.account.id,
    reason: `تعطيل حساب مريض بواسطة ${user.fullName}`,
  });

  return NextResponse.json({ ok: true, scope: "account" });
}
