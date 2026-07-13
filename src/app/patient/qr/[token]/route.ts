import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  SESSION_COOKIE,
  createSession,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/log";

/** دخول مباشر عبر مسح QR — بدون كلمة سر */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const clean = String(token || "").trim();
  const loginUrl = new URL("/patient/login", req.url);

  if (!clean || clean.length < 16) {
    return NextResponse.redirect(loginUrl);
  }

  const account = await prisma.patientAccount.findFirst({
    where: { qrAccessToken: clean, status: "ACTIVE" },
    include: { user: true, patient: true },
  });

  if (!account || account.user.status !== "ACTIVE" || account.user.deletedAt) {
    loginUrl.searchParams.set("error", "qr");
    return NextResponse.redirect(loginUrl);
  }

  const session = await createSession({
    userId: account.userId,
    rememberMe: true,
    ipAddress: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
    skipCookie: true,
  });

  await createAuditLog({
    userId: account.userId,
    roleCode: "PATIENT",
    action: "PATIENT_QR_LOGIN",
    entityType: "PatientAccount",
    entityId: account.id,
    reason: `دخول عبر QR — ${account.patient.fullName}`,
  });

  const res = NextResponse.redirect(new URL("/patient/dashboard", req.url));
  res.cookies.set(
    SESSION_COOKIE,
    session.token,
    sessionCookieOptions(session.expiresAt),
  );
  return res;
}
