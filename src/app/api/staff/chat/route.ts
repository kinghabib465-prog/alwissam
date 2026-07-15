import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import {
  isStaffChatRole,
  listStaffPeers,
  roleLabelAr,
} from "@/lib/staff-chat";
import { createAuditLog } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaffChatRole(user.role.code)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const markRead = req.nextUrl.searchParams.get("markRead") === "1";
  const peers = await listStaffPeers(user);
  const peerIds = peers.map((p) => p.id);

  const messages = peerIds.length
    ? await prisma.message.findMany({
        where: {
          patientId: null,
          OR: [
            { senderId: user.id, receiverId: { in: peerIds } },
            { receiverId: user.id, senderId: { in: peerIds } },
          ],
        },
        include: {
          sender: { include: { role: true } },
          receiver: { include: { role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      })
    : [];

  if (markRead) {
    const unreadIds = messages
      .filter((m) => m.receiverId === user.id && !m.readAt)
      .map((m) => m.id);
    if (unreadIds.length) {
      await prisma.message.updateMany({
        where: { id: { in: unreadIds } },
        data: { readAt: new Date() },
      });
    }
  }

  const unreadCount = await prisma.message.count({
    where: {
      patientId: null,
      receiverId: user.id,
      senderId: { in: peerIds.length ? peerIds : ["__none__"] },
      readAt: null,
    },
  });

  const threadMap = new Map<
    string,
    {
      peerId: string;
      peerName: string;
      peerRole: string;
      peerRoleLabel: string;
      group: "DOCTORS" | "SECRETARIES";
      messages: unknown[];
      unread: number;
    }
  >();

  for (const peer of peers) {
    threadMap.set(peer.id, {
      peerId: peer.id,
      peerName: peer.fullName,
      peerRole: peer.role,
      peerRoleLabel: peer.roleLabel,
      group: peer.group,
      messages: [],
      unread: 0,
    });
  }

  for (const m of messages) {
    const peerId =
      m.senderId === user.id ? m.receiverId : m.senderId;
    if (!peerId || !threadMap.has(peerId)) continue;
    const thread = threadMap.get(peerId)!;
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

  const threads = Array.from(threadMap.values())
    .map((t) => ({
      ...t,
      messages: [...t.messages].reverse(),
    }))
    .sort((a, b) => {
      const aLast = a.messages.length
        ? String((a.messages[a.messages.length - 1] as { createdAt: string }).createdAt)
        : "";
      const bLast = b.messages.length
        ? String((b.messages[b.messages.length - 1] as { createdAt: string }).createdAt)
        : "";
      if (aLast || bLast) return bLast.localeCompare(aLast);
      if (a.group !== b.group) return a.group === "DOCTORS" ? -1 : 1;
      return a.peerName.localeCompare(b.peerName, "ar");
    });

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
    peers,
    threads,
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
  const receiverId = String(body.receiverId || "");

  if (!text || text.length > 4000) {
    return NextResponse.json({ error: "نص الرسالة غير صالح" }, { status: 400 });
  }
  if (!receiverId) {
    return NextResponse.json(
      { error: "اختر مستلماً من القائمة أولاً" },
      { status: 400 },
    );
  }

  const peers = await listStaffPeers(user);
  if (!peers.some((p) => p.id === receiverId)) {
    return NextResponse.json({ error: "المستلم غير مسموح" }, { status: 400 });
  }

  const created = await prisma.message.create({
    data: {
      senderId: user.id,
      receiverId,
      kind: "TEXT",
      body: text,
      subject: "STAFF_CHAT",
    },
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "STAFF_CHAT_TEXT",
    entityType: "Message",
    entityId: created.id,
    newValue: { receiverId, preview: text.slice(0, 80) },
  });

  return NextResponse.json({ ok: true, id: created.id });
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
  const isSecretary =
    user.role.code === "SECRETARY" || user.role.code === "ADMIN";

  const canDelete =
    isSender || (message.kind === "VOICE" && (isReceiver || isSecretary));

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
