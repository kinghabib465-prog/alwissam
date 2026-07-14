import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { isStaffChatRole, listPeerStaffUserIds } from "@/lib/staff-chat";
import { createAuditLog } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
]);

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaffChatRole(user.role.code)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("audio");
  const receiverId = form.get("receiverId")
    ? String(form.get("receiverId"))
    : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ملف الصوت مطلوب" }, { status: 400 });
  }

  const mime = file.type || "audio/webm";
  if (!ALLOWED.has(mime) && !mime.startsWith("audio/")) {
    return NextResponse.json({ error: "نوع صوت غير مسموح" }, { status: 400 });
  }

  // ~2MB — short voice notes only (Render-friendly)
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: "المقطع الصوتي طويل جداً (الحد 2MB)" },
      { status: 400 },
    );
  }

  const peerIds = await listPeerStaffUserIds(user);
  if (receiverId && !peerIds.includes(receiverId)) {
    return NextResponse.json({ error: "المستلم غير مسموح" }, { status: 400 });
  }
  const targets = receiverId ? [receiverId] : peerIds;
  if (!targets.length) {
    return NextResponse.json({ error: "لا يوجد مستلمون" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Voice notes stay as data URLs so they work on Render free without Blob storage
  const audioUrl = `data:${mime};base64,${buffer.toString("base64")}`;

  const created = await prisma.$transaction(
    targets.map((targetId) =>
      prisma.message.create({
        data: {
          senderId: user.id,
          receiverId: targetId,
          kind: "VOICE",
          body: "رسالة صوتية",
          audioUrl,
          subject: "STAFF_CHAT_VOICE",
        },
      }),
    ),
  );

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "STAFF_CHAT_VOICE",
    entityType: "Message",
    entityId: created[0]?.id,
    newValue: { receivers: targets.length },
  });

  return NextResponse.json({ ok: true, count: created.length });
}
