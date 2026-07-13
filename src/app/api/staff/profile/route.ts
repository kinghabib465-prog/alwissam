import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createAuditLog } from "@/lib/audit/log";

/** تعديل بيانات دخول الطبيب (بريد/هاتف/كلمة سر) */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (
    !user ||
    !["SECRETARY", "ADMIN"].includes(user.role.code)
  ) {
    return NextResponse.json({ error: "غير مصرح — تحكم الدخول للمدير فقط" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const email = body.email !== undefined ? String(body.email).trim() : undefined;
  const phone = body.phone !== undefined ? String(body.phone).trim() : undefined;
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }

  if (newPassword) {
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "كلمة السر الجديدة يجب أن تكون 8 أحرف على الأقل" },
        { status: 400 },
      );
    }
    if (!currentPassword) {
      return NextResponse.json(
        { error: "أدخل كلمة السر الحالية" },
        { status: 400 },
      );
    }
    const ok = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "كلمة السر الحالية غير صحيحة" }, { status: 400 });
    }
  }

  if (email) {
    const taken = await prisma.user.findFirst({
      where: { email, NOT: { id: user.id } },
    });
    if (taken) {
      return NextResponse.json({ error: "البريد مستخدم مسبقًا" }, { status: 409 });
    }
  }
  if (phone) {
    const taken = await prisma.user.findFirst({
      where: { phone, NOT: { id: user.id } },
    });
    if (taken) {
      return NextResponse.json({ error: "الهاتف مستخدم مسبقًا" }, { status: 409 });
    }
  }

  const data: {
    email?: string;
    phone?: string;
    passwordHash?: string;
  } = {};
  if (email !== undefined) data.email = email || undefined;
  if (phone !== undefined) data.phone = phone || undefined;
  if (newPassword) data.passwordHash = await hashPassword(newPassword);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "STAFF_LOGIN_UPDATED",
    entityType: "User",
    entityId: user.id,
    newValue: {
      email: updated.email,
      phone: updated.phone,
      passwordChanged: !!newPassword,
    },
    reason: `تحديث بيانات الدخول بواسطة ${user.fullName}`,
  });

  return NextResponse.json({
    ok: true,
    user: { email: updated.email, phone: updated.phone },
  });
}
