import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createAuditLog } from "@/lib/audit/log";
import { rateLimit } from "@/lib/auth/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = await rateLimit({ key: `forgot:${ip}`, limit: 5, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "محاولات كثيرة" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const identifier = String(body.identifier || "");
  if (!identifier) {
    return NextResponse.json({ error: "أدخل البريد أو الهاتف" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [{ email: identifier }, { phone: identifier }],
    },
  });

  // Always return success to avoid account enumeration
  if (user) {
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
    // Provider-ready: token would be sent via email/SMS
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        ok: true,
        message: "إذا كان الحساب موجودًا سيتم إرسال رابط الاستعادة",
        devToken: token,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    message: "إذا كان الحساب موجودًا سيتم إرسال رابط الاستعادة",
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "");
  const password = String(body.password || "");
  if (!token || password.length < 8) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "الرمز غير صالح أو منتهٍ" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, failedLoginCount: 0, lockedUntil: null, status: "ACTIVE" },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await createAuditLog({
    userId: record.userId,
    action: "PASSWORD_RESET_COMPLETED",
    entityType: "User",
    entityId: record.userId,
  });

  return NextResponse.json({ ok: true, message: "تم تحديث كلمة المرور" });
}
