"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MessageCircle, Send, Square, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  kind: string;
  body: string;
  audioUrl?: string | null;
  createdAt: string;
  mine: boolean;
  senderName: string;
  senderRole: string;
  readAt: string | null;
};

type Thread = {
  peerId: string;
  peerName: string;
  peerRole: string;
  peerRoleLabel: string;
  messages: ChatMessage[];
  unread: number;
};

export function StaffChatWidget() {
  const [open, setOpen] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activePeerId, setActivePeerId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [csrf, setCsrf] = useState("");
  const [meName, setMeName] = useState("");
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/chat", { cache: "no-store" });
      if (res.status === 401) {
        setAllowed(false);
        return;
      }
      if (!res.ok) return;
      setAllowed(true);
      const data = await res.json();
      setThreads(data.threads || []);
      setUnread(data.unreadCount || 0);
      setCsrf(data.csrfToken || "");
      setMeName(data.me?.fullName || "");
      setActivePeerId((prev) => {
        if (prev) return prev;
        return data.threads?.[0]?.peerId || null;
      });
    } catch {
      // ignore poll errors
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 8000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, activePeerId, threads]);

  const active = useMemo(
    () => threads.find((t) => t.peerId === activePeerId) || null,
    [threads, activePeerId],
  );

  if (!allowed) return null;

  async function sendText(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !csrf) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/staff/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrf,
      },
      body: JSON.stringify({
        body: text.trim(),
        receiverId: activePeerId,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر الإرسال");
      return;
    }
    setText("");
    await load();
  }

  async function deleteMessage(messageId: string, kind: string) {
    if (!csrf) return;
    if (
      !window.confirm(
        kind === "VOICE" ? "حذف الرسالة الصوتية؟" : "حذف الرسالة؟",
      )
    ) {
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/staff/chat", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrf,
      },
      body: JSON.stringify({ messageId }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذر الحذف");
      return;
    }
    await load();
  }

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size < 100) {
          setError("التسجيل قصير جداً");
          return;
        }
        const form = new FormData();
        form.append("audio", blob, `voice-${Date.now()}.webm`);
        if (activePeerId) form.append("receiverId", activePeerId);
        setLoading(true);
        const res = await fetch("/api/staff/chat/voice", {
          method: "POST",
          headers: { "x-csrf-token": csrf },
          body: form,
        });
        setLoading(false);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "تعذر إرسال الصوت");
          return;
        }
        await load();
      };
      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("يرجى السماح بالميكروفون");
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 left-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-teal text-white shadow-lg transition hover:scale-105"
        aria-label="دردشة الطاقم"
      >
        <MessageCircle className="h-6 w-6" />
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed bottom-24 left-5 z-50 flex h-[min(560px,75vh)] w-[min(380px,92vw)] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-navy px-4 py-3 text-white">
            <div>
              <p className="text-sm font-bold">دردشة الطاقم</p>
              <p className="text-xs text-white/70">{meName || "…"}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1">
            <aside className="w-[38%] overflow-y-auto border-l border-border bg-[#F7FAFC]">
              {threads.length === 0 ? (
                <p className="p-3 text-xs text-muted">لا محادثات بعد</p>
              ) : (
                threads.map((t) => (
                  <button
                    key={t.peerId}
                    type="button"
                    onClick={() => setActivePeerId(t.peerId)}
                    className={cn(
                      "w-full border-b border-border px-2 py-2.5 text-right",
                      activePeerId === t.peerId ? "bg-soft-teal/50" : "hover:bg-white",
                    )}
                  >
                    <p className="truncate text-xs font-bold text-navy">{t.peerName}</p>
                    <p className="truncate text-[10px] text-muted">{t.peerRoleLabel}</p>
                    {t.unread > 0 ? (
                      <span className="mt-1 inline-block rounded-full bg-teal px-1.5 text-[10px] text-white">
                        {t.unread}
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </aside>

            <section className="flex min-w-0 flex-1 flex-col">
              <div className="border-b border-border px-3 py-2">
                {active ? (
                  <>
                    <p className="text-sm font-bold text-navy">{active.peerName}</p>
                    <p className="text-[11px] text-muted">{active.peerRoleLabel}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted">اختر مرسلًا من القائمة</p>
                )}
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
                {active?.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[90%] rounded-2xl px-3 py-2 text-sm",
                      m.mine
                        ? "mr-auto bg-teal text-white"
                        : "ml-auto bg-[#EEF3F8] text-navy",
                    )}
                  >
                    {!m.mine ? (
                      <p className="mb-1 text-[10px] font-semibold opacity-80">
                        {m.senderName} · {m.senderRole}
                      </p>
                    ) : null}
                    {m.kind === "VOICE" && m.audioUrl ? (
                      <div className="space-y-1">
                        <audio controls src={m.audioUrl} className="w-full max-w-[220px]" />
                        <button
                          type="button"
                          onClick={() => void deleteMessage(m.id, "VOICE")}
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-semibold",
                            m.mine ? "text-white/85 hover:text-white" : "text-danger hover:underline",
                          )}
                        >
                          <Trash2 className="h-3 w-3" />
                          حذف الصوت
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        {m.mine ? (
                          <button
                            type="button"
                            onClick={() => void deleteMessage(m.id, "TEXT")}
                            className="mt-1 inline-flex items-center gap-1 text-[10px] text-white/80 hover:text-white"
                          >
                            <Trash2 className="h-3 w-3" />
                            حذف
                          </button>
                        ) : null}
                      </div>
                    )}
                    <p
                      className={cn(
                        "mt-1 text-[10px] font-latin",
                        m.mine ? "text-white/70" : "text-muted",
                      )}
                      dir="ltr"
                    >
                      {new Date(m.createdAt).toLocaleString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={sendText} className="border-t border-border p-2">
                <div className="flex items-end gap-1">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={2}
                    placeholder="اكتب رسالة للسكرتارية / الطبيب…"
                    className="min-h-[44px] flex-1 resize-none rounded-xl border border-border px-2 py-1.5 text-sm outline-none focus:border-teal"
                  />
                  <button
                    type="button"
                    onClick={recording ? stopRecording : startRecording}
                    disabled={loading || !csrf}
                    className={cn(
                      "rounded-xl p-2 text-white",
                      recording ? "bg-danger" : "bg-navy",
                    )}
                    aria-label={recording ? "إيقاف التسجيل" : "تسجيل صوت"}
                  >
                    {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !text.trim()}
                    className="rounded-xl bg-teal p-2 text-white disabled:opacity-50"
                    aria-label="إرسال"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
                {recording ? (
                  <p className="mt-1 text-xs font-semibold text-danger">جاري التسجيل… اضغط الإيقاف للإرسال</p>
                ) : null}
              </form>
            </section>
          </div>
        </div>
      ) : null}
    </>
  );
}
