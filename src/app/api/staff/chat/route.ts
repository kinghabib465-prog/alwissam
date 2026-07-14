import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import {
  isStaffChatRole,
  listPeerStaffUserIds,
  roleLabelAr,
} from "@/lib/staff-chat";
import { createAuditLog } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isStaffChatRole(user.role.code)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const peerIds = await listPeerStaffUserIds(user);
  const messages = await prisma.message.findMany({
    where: {
      patientId: null,
      OR: [
        { senderId: user.id, receiverId: { in: peerIds } },
        { receiverId: user.id, senderId: { in: peerIds } },
        // broadcast to all peers: receiverId null, sender is peer or self
        { receiverId: null, senderId: { in: [...peerIds, user.id] } },
      ],
    },
    include: {
      sender: { include: { role: true } },
      receiver: { include: { role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 120,
  });

  // Mark unread incoming as read
  const unreadIds = messages
    .filter((m) => m.receiverId === user.id && !m.readAt)
    .map((m) => m.id);
  if (unreadIds.length) {
    await prisma.message.updateMany({
      where: { id: { in: unreadIds } },
      data: { readAt: new Date() },
    });
  }

  const unreadCount = messages.filter(
    (m) =>
      (m.receiverId === user.id || m.receiverId === null) &&
      m.senderId !== user.id &&
      !m.readAt,
  ).length;

  // Group by counterpart for organized secretary view
  const threads = new Map<
    string,
    {
      peerId: string;
      peerName: string;
      peerRole: string;
      peerRoleLabel: string;
      messages: unknown[];
      unread: number;
    }
  >();

  for (const m of messages) {
    const peer =
      m.senderId === user.id
        ? m.receiver || m.sender
        : m.sender || m.receiver;
    if (!peer) continue;
    const peerId =
      m.senderId === user.id
        ? m.receiverId || peer.id
        : m.senderId || peer.id;
    if (!peerId) continue;

    if (!threads.has(peerId)) {
      threads.set(peerId, {
        peerId,
        peerName: peer.fullName,
        peerRole: peer.role.code,
        peerRoleLabel: roleLabelAr(peer.role.code),
        messages: [],
        unread: 0,
      });
    }
    const thread = threads.get(peerId)!;
    thread.messages.push({
      id: m.id,
      kind: m.kind,
      body: m.body,
      audioUrl: m.audioUrl,
      createdAt: m.createdAt.toISOString(),
      mine: m.senderId === user.id,
      senderName: m.sender?.fullName || "—",
      senderRole: m.sender ? roleLabelAr(m.sender.role.code) : "",
      readAt: m.readAt?.toISOString() || null,
    });
    if (m.senderId !== user.id && !m.readAt) thread.unread += 1;
  }

  return NextResponse.json({
    ok: true,
    csrfToken: user.csrfToken,
    me: {
      id: user.id,
      fullName: user.fullName,
      role: user.role.code,
      roleLabel: roleLabelAr(user.role.code),
    },
    unreadCount,
    threads: Array.from(threads.values()).map((t) => ({
      ...t,
      messages: [...t.messages].reverse(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaffChatRole(user.role.code)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const text = String(body.body || "").trim();
  const receiverId = body.receiverId ? String(body.receiverId) : null;

  if (!text || text.length > 4000) {
    return NextResponse.json({ error: "نص الرسالة غير صالح" }, { status: 400 });
  }

  const peerIds = await listPeerStaffUserIds(user);
  if (receiverId && !peerIds.includes(receiverId)) {
    return NextResponse.json({ error: "المستلم غير مسموح" }, { status: 400 });
  }

  // Default: broadcast to all peers as separate messages for clear routing
  const targets = receiverId ? [receiverId] : peerIds;
  if (!targets.length) {
    return NextResponse.json({ error: "لا يوجد مستلمون" }, { status: 400 });
  }

  const created = await prisma.$transaction(
    targets.map((targetId) =>
      prisma.message.create({
        data: {
          senderId: user.id,
          receiverId: targetId,
          kind: "TEXT",
          body: text,
          subject: "STAFF_CHAT",
        },
      }),
    ),
  );

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "STAFF_CHAT_TEXT",
    entityType: "Message",
    entityId: created[0]?.id,
    newValue: { receivers: targets.length, preview: text.slice(0, 80) },
  });

  return NextResponse.json({ ok: true, count: created.length });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaffChatRole(user.role.code)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const messageId = String(body.messageId || "");
  if (!messageId) {
    return NextResponse.json({ error: "معرّف الرسالة مطلوب" }, { status: 400 });
  }

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message || message.patientId) {
    return NextResponse.json({ error: "الرسالة غير موجودة" }, { status: 404 });
  }

  const isSender = message.senderId === user.id;
  const isReceiver = message.receiverId === user.id;
  const isSecretary = user.role.code === "SECRETARY" || user.role.code === "ADMIN";

  // المرسل يحذف رسالته؛ السكرتير/الإدارة تحذف أي رسالة صوتية واردة أو صادرة في دردشة الطاقم
  const canDelete =
    isSender ||
    (message.kind === "VOICE" && (isReceiver || isSecretary));

  if (!canDelete) {
    return NextResponse.json({ error: "غير مسموح بحذف هذه الرسالة" }, { status: 403 });
  }

  if (message.kind !== "VOICE" && !isSender) {
    return NextResponse.json(
      { error: "حذف الرسائل النصية متاح لمرسلها فقط" },
      { status: 403 },
    );
  }

  await prisma.message.delete({ where: { id: messageId } });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "STAFF_CHAT_DELETE",
    entityType: "Message",
    entityId: messageId,
    reason: `حذف رسالة ${message.kind} بواسطة ${user.fullName}`,
  });

  return NextResponse.json({ ok: true });
}
