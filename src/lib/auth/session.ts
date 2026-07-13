import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

export const SESSION_COOKIE = "alwisam_session";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionMaxAgeMs(rememberMe: boolean) {
  if (rememberMe) {
    const days = Number(process.env.SESSION_REMEMBER_DAYS || 30);
    return days * 24 * 60 * 60 * 1000;
  }
  const hours = Number(process.env.SESSION_MAX_AGE_HOURS || 12);
  return hours * 60 * 60 * 1000;
}

export async function createSession(params: {
  userId: string;
  rememberMe?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  /** إن true لا يضبط الكوكي هنا — يُعاد التوكن لضبطه على Response */
  skipCookie?: boolean;
}) {
  const token = randomBytes(32).toString("hex");
  const csrfToken = randomBytes(24).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + sessionMaxAgeMs(!!params.rememberMe));

  await prisma.session.create({
    data: {
      userId: params.userId,
      tokenHash,
      csrfToken,
      ipAddress: params.ipAddress || undefined,
      userAgent: params.userAgent || undefined,
      rememberMe: !!params.rememberMe,
      expiresAt,
    },
  });

  if (!params.skipCookie) {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
  }

  return { token, csrfToken, expiresAt };
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export async function getSessionFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          role: true,
          doctor: true,
          secretary: true,
          patientAccount: { include: { patient: true } },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  if (session.user.deletedAt || session.user.status !== "ACTIVE") {
    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { lastActivityAt: new Date() },
  });

  return session;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function revokeAllUserSessions(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
