import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createAuditLog } from "@/lib/audit/log";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "");
  const password = String(body.password || "");
  if (!token || password.length < 8) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await prisma.activationToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "رمز التفعيل غير صالح أو منتهٍ" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, status: "ACTIVE" },
    }),
    prisma.patientAccount.updateMany({
      where: { userId: record.userId },
      data: { status: "ACTIVE", activatedAt: new Date() },
    }),
    prisma.activationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await createAuditLog({
    userId: record.userId,
    action: "PATIENT_ACCOUNT_ACTIVATED",
    entityType: "User",
    entityId: record.userId,
  });

  return NextResponse.json({ ok: true, message: "تم تفعيل الحساب" });
}
