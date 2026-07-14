import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isClinicOwner } from "@/lib/auth/clinic-owner";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createAuditLog } from "@/lib/audit/log";
import { SHIFT_PRESETS } from "@/lib/secretary-shift";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isClinicOwner(user)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json();
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const password = String(body.password || "");
  const shiftCode = String(body.shiftCode || "MORNING").toUpperCase();
  if (!fullName || !email || !phone || password.length < 8) {
    return NextResponse.json({ error: "بيانات غير مكتملة" }, { status: 400 });
  }

  const role = await prisma.role.findUnique({ where: { code: "SECRETARY" } });
  if (!role) {
    return NextResponse.json({ error: "دور السكرتير غير موجود" }, { status: 500 });
  }

  const preset =
    shiftCode === "EVENING" ? SHIFT_PRESETS.EVENING : SHIFT_PRESETS.MORNING;

  const passwordHash = await hashPassword(password);
  const created = await prisma.user.create({
    data: {
      fullName,
      email,
      phone,
      passwordHash,
      roleId: role.id,
      status: "ACTIVE",
      secretary: {
        create: {
          shiftCode: shiftCode === "EVENING" ? "EVENING" : "MORNING",
          workStartTime: preset.start,
          workEndTime: preset.end,
        },
      },
    },
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "SECRETARY_CREATED",
    entityType: "User",
    entityId: created.id,
    newValue: { fullName, email, phone, shiftCode },
    reason: `تم إنشاء حساب سكرتير بواسطة ${user.fullName}`,
  });

  return NextResponse.json({
    ok: true,
    user: { id: created.id, fullName: created.fullName, email: created.email },
  });
}

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
  if (!userId) {
    return NextResponse.json({ error: "معرّف مطلوب" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { secretary: true, role: true },
  });
  if (!target?.secretary || target.role.code !== "SECRETARY") {
    return NextResponse.json({ error: "السكرتير غير موجود" }, { status: 404 });
  }

  const section = String(body.section || "login");

  if (section === "login") {
    const email = body.email !== undefined ? String(body.email).trim() : undefined;
    const phone = body.phone !== undefined ? String(body.phone).trim() : undefined;
    const newPassword = String(body.newPassword || "");

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

    const data: {
      email?: string;
      phone?: string;
      passwordHash?: string;
      status?: "ACTIVE";
      failedLoginCount?: number;
      lockedUntil?: null;
    } = {
      status: "ACTIVE",
      failedLoginCount: 0,
      lockedUntil: null,
    };
    if (email !== undefined) data.email = email || undefined;
    if (phone !== undefined) data.phone = phone || undefined;
    if (newPassword) data.passwordHash = await hashPassword(newPassword);

    await prisma.user.update({ where: { id: userId }, data });
    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "SECRETARY_LOGIN_UPDATED",
      entityType: "User",
      entityId: userId,
      reason: `تعديل دخول سكرتير بواسطة ${user.fullName}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (section === "hours") {
    let shiftCode = String(body.shiftCode || target.secretary.shiftCode || "MORNING").toUpperCase();
    let workStartTime = String(
      body.workStartTime || target.secretary.workStartTime || "07:00",
    );
    let workEndTime = String(
      body.workEndTime || target.secretary.workEndTime || "14:30",
    );
    const workDaysRaw =
      body.workDays ?? target.secretary.workDays ?? "SUN,MON,TUE,WED,THU,SAT";
    const workDays = String(workDaysRaw);

    if (shiftCode === "MORNING") {
      workStartTime = SHIFT_PRESETS.MORNING.start;
      workEndTime = SHIFT_PRESETS.MORNING.end;
    } else if (shiftCode === "EVENING") {
      workStartTime = SHIFT_PRESETS.EVENING.start;
      workEndTime = SHIFT_PRESETS.EVENING.end;
    } else {
      shiftCode = "CUSTOM";
    }

    await prisma.secretaryProfile.update({
      where: { userId },
      data: { shiftCode, workStartTime, workEndTime, workDays },
    });

    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "SECRETARY_HOURS_UPDATED",
      entityType: "SecretaryProfile",
      entityId: target.secretary.id,
      newValue: { shiftCode, workStartTime, workEndTime, workDays },
      reason: `تحديد أوقات عمل سكرتير بواسطة ${user.fullName}`,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "قسم غير معروف" }, { status: 400 });
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

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true, secretary: true },
  });
  if (!target || !target.secretary || target.role.code !== "SECRETARY") {
    return NextResponse.json({ error: "حساب السكرتير غير موجود" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      status: "INACTIVE",
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "SECRETARY_DELETED",
    entityType: "User",
    entityId: userId,
    oldValue: { fullName: target.fullName, email: target.email, status: target.status },
    newValue: { status: "INACTIVE" },
    reason: `تم حذف/تعطيل حساب السكرتير بواسطة ${user.fullName}`,
  });

  return NextResponse.json({ ok: true });
}
