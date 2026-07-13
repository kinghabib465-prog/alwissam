import { NextResponse } from "next/server";
import { destroySession, getSessionFromCookie } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/log";

export async function POST() {
  const session = await getSessionFromCookie();
  if (session) {
    await createAuditLog({
      userId: session.userId,
      roleCode: session.user.role.code,
      action: "LOGOUT",
      entityType: "User",
      entityId: session.userId,
    });
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
