import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createAuditLog } from "@/lib/audit/log";
import {
  isEmailConfigured,
  sendEmailChangeVerification,
} from "@/lib/notifications/email";

/**
 * تعديل بيانات دخول الطاقم (هاتف/كلمة سر فوراً · البريد عبر تأكيد بالرسالة)
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (
    !user ||
    !["SECRETARY", "ADMIN", "DOCTOR_GENERAL", "DOCTOR_SPECIALIST"].includes(
      user.role.code,
    )
  ) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
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
      return NextResponse.json(
        { error: "كلمة السر الحالية غير صحيحة" },
        { status: 400 },
      );
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

  let emailPendingMessage: string | null = null;
  const normalizedNewEmail = email?.toLowerCase();
  const emailChanged =
    email !== undefined &&
    !!normalizedNewEmail &&
    normalizedNewEmail.includes("@") &&
    normalizedNewEmail !== (dbUser.email || "").toLowerCase();

  if (emailChanged && normalizedNewEmail) {
    const taken = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedNewEmail, mode: "insensitive" },
        NOT: { id: user.id },
        deletedAt: null,
      },
    });
    if (taken) {
      return NextResponse.json({ error: "البريد مستخدم مسبقًا" }, { status: 409 });
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error:
            "لا يمكن تأكيد البريد: إعدادات الإرسال غير موجودة (BREVO_API_KEY أو SMTP أو RESEND).",
        },
        { status: 503 },
      );
    }

    await prisma.emailChangeToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await prisma.emailChangeToken.create({
      data: {
        userId: user.id,
        newEmail: normalizedNewEmail,
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    try {
      await sendEmailChangeVerification({
        to: normalizedNewEmail,
        fullName: user.fullName,
        token,
      });
      emailPendingMessage = `أُرسلت رسالة تأكيد إلى ${normalizedNewEmail}. البريد الحالي يبقى سارياً حتى التأكيد.`;
    } catch (err) {
      console.error("[staff/profile] email change failed:", err);
      return NextResponse.json(
        { error: "تعذر إرسال رسالة تأكيد البريد" },
        { status: 502 },
      );
    }
  }

  const data: {
    phone?: string;
    passwordHash?: string;
  } = {};
  if (phone !== undefined) data.phone = phone || undefined;
  if (newPassword) data.passwordHash = await hashPassword(newPassword);

  const updated =
    Object.keys(data).length > 0
      ? await prisma.user.update({ where: { id: user.id }, data })
      : dbUser;

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
      emailChangePending: emailPendingMessage ? normalizedNewEmail : null,
    },
    reason: `تحديث بيانات الدخول بواسطة ${user.fullName}`,
  });

  return NextResponse.json({
    ok: true,
    message: emailPendingMessage || "تم حفظ التعديلات",
    user: { email: updated.email, phone: updated.phone },
    emailChangePending: !!emailPendingMessage,
  });
}
