import { NextRequest, NextResponse } from "next/server";
import { WaitingRoomStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";
import { publishEvent } from "@/lib/db/redis";
import { removePatientBeforeDoctor } from "@/lib/services/appointments";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  if (body.action === "remove") {
    if (!["SECRETARY", "ADMIN"].includes(user.role.code)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    try {
      await removePatientBeforeDoctor({
        waitingEntryId: id,
        userId: user.id,
        roleCode: user.role.code,
        userName: user.fullName,
      });
      return NextResponse.json({ ok: true, message: "تم الحذف" });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "فشل الحذف" },
        { status: 400 },
      );
    }
  }

  const status = body.status as WaitingRoomStatus;

  const existing = await prisma.waitingRoomEntry.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  }

  const data: Record<string, unknown> = { status };
  if (status === "WITH_DOCTOR") data.startedAt = new Date();
  if (status === "SESSION_DONE" || status === "LEFT") {
    data.completedAt = new Date();
  }

  const updated = await prisma.waitingRoomEntry.update({
    where: { id },
    data,
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "WAITING_ROOM_STATUS_CHANGE",
    entityType: "WaitingRoomEntry",
    entityId: id,
    oldValue: { status: existing.status },
    newValue: { status },
    reason: `تم التحديث بواسطة ${user.fullName}`,
  });

  await publishEvent("clinic:waiting-room", { id, status });

  return NextResponse.json({ ok: true, entry: updated });
}
