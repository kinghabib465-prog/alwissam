import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createAuditLog } from "@/lib/audit/log";
import { rateLimit } from "@/lib/auth/rate-limit";
import {
  isEmailConfigured,
  sendPasswordResetEmail,
} from "@/lib/notifications/email";

function clientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = await rateLimit({
    key: `forgot:${ip}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: "محاولات كثيرة" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const identifier = String(body.identifier || "").trim();
  const portal = body.portal === "patient" ? "patient" : "staff";
  const normalizedIdentifier = identifier.includes("@")
    ? identifier.toLowerCase()
    : identifier;
  if (!identifier) {
    return NextResponse.json({ error: "أدخل البريد أو الهاتف" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [
        {
          email: {
            equals: normalizedIdentifier,
            mode: "insensitive",
          },
        },
        { phone: normalizedIdentifier },
      ],
    },
    include: { role: true },
  });

  const generic = {
    ok: true,
    message:
      "إذا كان الحساب مرتبطاً ببريد إلكتروني صالح، ستصلك رسالة خلال دقائق. تحقق من البريد الوارد والمزعج.",
  };

  // Always return success to avoid account enumeration
  if (!user) {
    return NextResponse.json(generic);
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  await createAuditLog({
    userId: user.id,
    action: "PASSWORD_RESET_REQUESTED",
    entityType: "User",
    entityId: user.id,
    ipAddress: ip,
  });

  const email = user.email?.trim();
  if (email) {
    try {
      await sendPasswordResetEmail({
        to: email,
        fullName: user.fullName,
        token,
        portal:
          user.role.code === "PATIENT" || portal === "patient"
            ? "patient"
            : "staff",
      });
      await createAuditLog({
        userId: user.id,
        action: "PASSWORD_RESET_EMAIL_SENT",
        entityType: "User",
        entityId: user.id,
        ipAddress: ip,
        reason: `أُرسلت رسالة الاستعادة إلى ${email}`,
      });
    } catch (err) {
      console.error("[password-reset] email failed:", err);
      await createAuditLog({
        userId: user.id,
        action: "PASSWORD_RESET_EMAIL_FAILED",
        entityType: "User",
        entityId: user.id,
        ipAddress: ip,
        reason: err instanceof Error ? err.message : "فشل إرسال البريد",
      });

      // تطوير فقط: إن لم يُضبط البريد أو فشل الإرسال — أعرض الرمز للاختبار
      if (process.env.NODE_ENV === "development" || !isEmailConfigured()) {
        return NextResponse.json({
          ...generic,
          message:
            process.env.NODE_ENV === "development"
              ? "تعذر إرسال البريد — استخدم رابط التطوير أدناه"
              : "تعذر إرسال البريد حالياً. تأكد من ضبط SMTP أو Resend في إعدادات الاستضافة.",
          error: "EMAIL_SEND_FAILED",
          ...(process.env.NODE_ENV === "development" ? { devToken: token } : {}),
        });
      }
    }
  } else if (process.env.NODE_ENV === "development") {
    return NextResponse.json({
      ...generic,
      message: "لا يوجد بريد على الحساب — رابط التطوير للاختبار فقط",
      devToken: token,
    });
  }

  return NextResponse.json(generic);
}

export async function PUT(req: NextRequest) {
  const ip = clientIp(req);
  const rl = await rateLimit({
    key: `reset:${ip}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "محاولات كثيرة. حاول لاحقًا." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "").trim();
  const password = String(body.password || "");
  if (!token || password.length < 8) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "الرمز غير صالح أو منتهٍ" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        failedLoginCount: 0,
        lockedUntil: null,
        status: "ACTIVE",
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await createAuditLog({
    userId: record.userId,
    action: "PASSWORD_RESET_COMPLETED",
    entityType: "User",
    entityId: record.userId,
    ipAddress: ip,
  });

  return NextResponse.json({ ok: true, message: "تم تحديث كلمة المرور" });
}
