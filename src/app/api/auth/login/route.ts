import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/auth/rate-limit";
import { createAuditLog, roleDashboardPath } from "@/lib/audit/log";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "بيانات غير صالحة" },
      { status: 400 },
    );
  }

  const { identifier, password, rememberMe, portal } = parsed.data;
  const normalizedIdentifier = identifier.includes("@")
    ? identifier.toLowerCase()
    : identifier;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = req.headers.get("user-agent");

  const rl = await rateLimit({
    key: `login:${ip}:${normalizedIdentifier}`,
    limit: Number(process.env.MAX_LOGIN_ATTEMPTS || 5),
    windowMs: 15 * 60 * 1000,
    increment: false,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "تم تجاوز عدد محاولات الدخول. حاول لاحقًا." },
      { status: 429 },
    );
  }

  const consumeLoginAttempt = async () => {
    await rateLimit({
      key: `login:${ip}:${normalizedIdentifier}`,
      limit: Number(process.env.MAX_LOGIN_ATTEMPTS || 5),
      windowMs: 15 * 60 * 1000,
      increment: true,
    });
  };

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

  const fail = async (
    reason: string,
    options: { incrementAttempts?: boolean } = {},
  ) => {
    const incrementAttempts = options.incrementAttempts !== false;
    if (incrementAttempts) {
      await consumeLoginAttempt();
    }
    await prisma.loginHistory.create({
      data: {
        userId: user?.id,
        identifier: normalizedIdentifier,
        success: false,
        ipAddress: ip,
        userAgent: userAgent || undefined,
        reason,
      },
    });
    if (user && incrementAttempts) {
      const maxAttempts = Number(process.env.MAX_LOGIN_ATTEMPTS || 5);
      const lockMinutes = Number(process.env.LOCKOUT_MINUTES || 30);
      const failedLoginCount = user.failedLoginCount + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount,
          lockedUntil:
            failedLoginCount >= maxAttempts
              ? new Date(Date.now() + lockMinutes * 60_000)
              : user.lockedUntil,
          status:
            failedLoginCount >= maxAttempts ? "LOCKED" : user.status,
        },
      });
    }
    await createAuditLog({
      userId: user?.id,
      roleCode: user?.role.code,
      action: "LOGIN_FAILED",
      entityType: "User",
      entityId: user?.id,
      reason,
      ipAddress: ip,
      deviceInfo: userAgent,
    });
  };

  if (!user) {
    await fail("المستخدم غير موجود");
    return NextResponse.json(
      { error: "بيانات الدخول غير صحيحة" },
      { status: 401 },
    );
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await fail("الحساب مقفل مؤقتًا", { incrementAttempts: false });
    return NextResponse.json(
      { error: "الحساب مقفل مؤقتًا بسبب محاولات فاشلة متكررة" },
      { status: 423 },
    );
  }

  if (user.status !== "ACTIVE" && user.status !== "LOCKED") {
    await fail("الحساب غير نشط", { incrementAttempts: false });
    return NextResponse.json({ error: "الحساب غير نشط" }, { status: 403 });
  }

  if (portal === "patient" && user.role.code !== "PATIENT") {
    await fail("بوابة المريض فقط", { incrementAttempts: false });
    return NextResponse.json(
      { error: "هذا الحساب غير مخصص لبوابة المرضى" },
      { status: 403 },
    );
  }
  if (portal === "staff" && user.role.code === "PATIENT") {
    await fail("بوابة الطاقم فقط", { incrementAttempts: false });
    return NextResponse.json(
      { error: "يرجى استخدام بوابة المرضى" },
      { status: 403 },
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await fail("كلمة مرور خاطئة");
    return NextResponse.json(
      { error: "بيانات الدخول غير صحيحة" },
      { status: 401 },
    );
  }

  // السكرتير يدخل فقط ضمن أوقات ورديته
  if (user.role.code === "SECRETARY") {
    const secretary = await prisma.secretaryProfile.findUnique({
      where: { userId: user.id },
    });
    if (!secretary) {
      await fail("ملف السكرتارية غير مكتمل", { incrementAttempts: false });
      return NextResponse.json(
        { error: "تعذر التحقق من جدول عمل الحساب. راجعي صاحبة العيادة." },
        { status: 403 },
      );
    }

    const { isWithinSecretaryShift } = await import("@/lib/secretary-shift");
    const gate = isWithinSecretaryShift(secretary);
    if (!gate.ok) {
      await fail(gate.message || "خارج أوقات العمل", {
        incrementAttempts: false,
      });
      return NextResponse.json(
        { error: gate.message || "حسابك مغلق خارج أوقات العمل" },
        { status: 403 },
      );
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      status: "ACTIVE",
      lastLoginAt: new Date(),
    },
  });

  await createSession({
    userId: user.id,
    rememberMe,
    ipAddress: ip,
    userAgent,
  });

  await prisma.loginHistory.create({
    data: {
      userId: user.id,
      identifier: normalizedIdentifier,
      success: true,
      ipAddress: ip,
      userAgent: userAgent || undefined,
    },
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "LOGIN_SUCCESS",
    entityType: "User",
    entityId: user.id,
    ipAddress: ip,
    deviceInfo: userAgent,
  });

  return NextResponse.json({
    ok: true,
    redirectTo: roleDashboardPath(user.role.code),
    user: {
      id: user.id,
      fullName: user.fullName,
      role: user.role.code,
    },
  });
}
