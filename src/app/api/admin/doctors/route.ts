import { NextRequest, NextResponse } from "next/server";
import { DoctorType } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isClinicOwner } from "@/lib/auth/clinic-owner";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createAuditLog } from "@/lib/audit/log";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isClinicOwner(user)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const password = String(body.password || "");
  const typeRaw = String(body.type || "GENERAL").toUpperCase();
  const specialtyAr = String(body.specialtyAr || "").trim();

  if (!fullName || !email || !phone || password.length < 8) {
    return NextResponse.json({ error: "بيانات غير مكتملة" }, { status: 400 });
  }
  if (typeRaw !== "GENERAL" && typeRaw !== "SPECIALIST") {
    return NextResponse.json({ error: "نوع الطبيب غير صالح" }, { status: 400 });
  }
  const type = typeRaw as DoctorType;

  const roleCode = type === "SPECIALIST" ? "DOCTOR_SPECIALIST" : "DOCTOR_GENERAL";
  const role = await prisma.role.findUnique({ where: { code: roleCode } });
  if (!role) {
    return NextResponse.json({ error: "دور الطبيب غير موجود" }, { status: 500 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
  });
  if (existing) {
    return NextResponse.json(
      { error: "البريد أو الهاتف مستخدم مسبقًا" },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  const defaultSpecialty =
    specialtyAr ||
    (type === "SPECIALIST"
      ? "تقويم الأسنان · التركيبات · الجراحة"
      : "الحالات الاستعجالية · العلاج العام");

  const created = await prisma.user.create({
    data: {
      fullName,
      email,
      phone,
      passwordHash,
      roleId: role.id,
      status: "ACTIVE",
      doctor: {
        create: {
          type,
          specialtyAr: defaultSpecialty,
          colorCode: type === "SPECIALIST" ? "#0F9A9A" : "#176B87",
          isActive: true,
        },
      },
    },
    include: { doctor: true },
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "DOCTOR_CREATED",
    entityType: "User",
    entityId: created.id,
    newValue: { fullName, email, phone, type },
    reason: `تم إنشاء حساب طبيب بواسطة ${user.fullName}`,
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: created.id,
      fullName: created.fullName,
      email: created.email,
      type,
    },
  });
}

/** تعديل بيانات دخول طبيب بواسطة صاحبة العيادة */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isClinicOwner(user)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "");
  const email = body.email !== undefined ? String(body.email).trim() : undefined;
  const phone = body.phone !== undefined ? String(body.phone).trim() : undefined;
  const newPassword = String(body.newPassword || "");

  if (!userId) {
    return NextResponse.json({ error: "معرّف الطبيب مطلوب" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { doctor: true, role: true },
  });
  if (!target?.doctor) {
    return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });
  }

  if (email) {
    const taken = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } },
    });
    if (taken) {
      return NextResponse.json({ error: "البريد مستخدم" }, { status: 409 });
    }
  }
  if (phone) {
    const taken = await prisma.user.findFirst({
      where: { phone, NOT: { id: userId } },
    });
    if (taken) {
      return NextResponse.json({ error: "الهاتف مستخدم" }, { status: 409 });
    }
  }
  if (newPassword && newPassword.length < 8) {
    return NextResponse.json(
      { error: "كلمة السر 8 أحرف على الأقل" },
      { status: 400 },
    );
  }

  const data: { email?: string; phone?: string; passwordHash?: string } = {};
  if (email !== undefined) data.email = email || undefined;
  if (phone !== undefined) data.phone = phone || undefined;
  if (newPassword) data.passwordHash = await hashPassword(newPassword);

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "DOCTOR_LOGIN_UPDATED",
    entityType: "User",
    entityId: userId,
    newValue: {
      email: updated.email,
      phone: updated.phone,
      passwordChanged: !!newPassword,
    },
    reason: `تعديل دخول طبيب بواسطة ${user.fullName}`,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isClinicOwner(user)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "");
  if (!userId) {
    return NextResponse.json({ error: "معرّف المستخدم مطلوب" }, { status: 400 });
  }
  if (userId === user.id) {
    return NextResponse.json(
      { error: "لا يمكن حذف حسابك أنت" },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true, doctor: true },
  });
  if (!target?.doctor || !["DOCTOR_GENERAL", "DOCTOR_SPECIALIST", "ADMIN"].includes(target.role.code)) {
    return NextResponse.json({ error: "حساب الطبيب غير موجود" }, { status: 404 });
  }
  if (target.role.code === "ADMIN") {
    return NextResponse.json(
      { error: "لا يمكن حذف حساب صاحبة العيادة" },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.doctor.update({
      where: { userId },
      data: { isActive: false },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { status: "INACTIVE" },
    }),
  ]);

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "DOCTOR_DELETED",
    entityType: "User",
    entityId: userId,
    oldValue: {
      fullName: target.fullName,
      email: target.email,
      type: target.doctor.type,
    },
    newValue: { status: "INACTIVE" },
    reason: `تم حذف/تعطيل حساب الطبيب بواسطة ${user.fullName}`,
  });

  return NextResponse.json({ ok: true });
}
