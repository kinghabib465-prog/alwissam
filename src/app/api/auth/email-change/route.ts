import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";
import {
  isEmailConfigured,
  sendEmailChangeVerification,
} from "@/lib/notifications/email";
import { rateLimit } from "@/lib/auth/rate-limit";

/**
 * طلب تغيير البريد — يرسل رابط تأكيد إلى البريد الجديد.
 * لا يُحدَّث البريد حتى يُفتح رابط التأكيد.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit({
    key: `email-change:${user.id}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: "محاولات كثيرة" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const newEmail = String(body.newEmail || "")
    .trim()
    .toLowerCase();
  if (!newEmail || !newEmail.includes("@") || newEmail.length < 5) {
    return NextResponse.json({ error: "أدخل بريداً صالحاً" }, { status: 400 });
  }

  if (user.email && user.email.toLowerCase() === newEmail) {
    return NextResponse.json(
      { error: "هذا هو بريدك الحالي بالفعل" },
      { status: 400 },
    );
  }

  const taken = await prisma.user.findFirst({
    where: {
      email: { equals: newEmail, mode: "insensitive" },
      NOT: { id: user.id },
      deletedAt: null,
    },
  });
  if (taken) {
    return NextResponse.json({ error: "البريد مستخدم مسبقاً" }, { status: 409 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "إرسال البريد غير مضبوط على السيرفر. أضيفي SMTP أو RESEND_API_KEY في إعدادات الاستضافة.",
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
      newEmail,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  try {
    await sendEmailChangeVerification({
      to: newEmail,
      fullName: user.fullName,
      token,
    });
  } catch (err) {
    console.error("[email-change] send failed:", err);
    return NextResponse.json(
      { error: "تعذر إرسال رسالة التأكيد. راجعي إعدادات البريد." },
      { status: 502 },
    );
  }

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "EMAIL_CHANGE_REQUESTED",
    entityType: "User",
    entityId: user.id,
    newValue: { newEmail },
    ipAddress: ip,
    reason: `طلب تأكيد بريد جديد بواسطة ${user.fullName}`,
  });

  return NextResponse.json({
    ok: true,
    message: `أُرسلت رسالة تأكيد إلى ${newEmail}. افتحي الرابط خلال 24 ساعة.`,
  });
}

/** تأكيد البريد من الرابط (بدون جلسة إلزامية — التوكن يكفي) */
export async function PUT(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit({
    key: `email-verify:${ip}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: "محاولات كثيرة" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "").trim();
  if (!token) {
    return NextResponse.json({ error: "الرمز مطلوب" }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await prisma.emailChangeToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "رابط التأكيد غير صالح أو منتهٍ" },
      { status: 400 },
    );
  }

  const taken = await prisma.user.findFirst({
    where: {
      email: { equals: record.newEmail, mode: "insensitive" },
      NOT: { id: record.userId },
      deletedAt: null,
    },
  });
  if (taken) {
    return NextResponse.json(
      { error: "البريد أصبح مستخدماً. اطلبي تغييراً جديداً." },
      { status: 409 },
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { email: record.newEmail },
    }),
    prisma.emailChangeToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await createAuditLog({
    userId: record.userId,
    action: "EMAIL_CHANGE_CONFIRMED",
    entityType: "User",
    entityId: record.userId,
    newValue: { email: record.newEmail },
    ipAddress: ip,
  });

  return NextResponse.json({
    ok: true,
    message: "تم تأكيد البريد الجديد بنجاح",
  });
}
