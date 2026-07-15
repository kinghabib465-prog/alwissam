"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MessageCircle, Send, Square, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toLatinDigits } from "@/lib/latin-digits";

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
  group: "DOCTORS" | "SECRETARIES";
  messages: ChatMessage[];
  unread: number;
};

type FilterKey = "ALL" | "DOCTORS" | "SECRETARIES";

/**
 * أيقونة دردشة واحدة — أطباء ↔ أطباء و أطباء ↔ سكرتارية بشكل منظم
 */
export function StaffChatWidget() {
  const [open, setOpen] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activePeerId, setActivePeerId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [text, setText] = useState("");
  const [csrf, setCsrf] = useState("");
  const [meName, setMeName] = useState("");
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async (opts?: { markRead?: boolean }) => {
    try {
      const q = opts?.markRead ? "?markRead=1" : "";
      const res = await fetch(`/api/staff/chat${q}`, { cache: "no-store" });
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
        if (prev && (data.threads || []).some((t: Thread) => t.peerId === prev)) {
          return prev;
        }
        return null;
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
    if (open) {
      void load({ markRead: true });
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, activePeerId, load]);

  const visible = useMemo(() => {
    if (filter === "ALL") return threads;
    return threads.filter((t) => t.group === filter);
  }, [threads, filter]);

  const doctors = useMemo(
    () => visible.filter((t) => t.group === "DOCTORS"),
    [visible],
  );
  const secretaries = useMemo(
    () => visible.filter((t) => t.group === "SECRETARIES"),
    [visible],
  );

  const active = useMemo(
    () => threads.find((t) => t.peerId === activePeerId) || null,
    [threads, activePeerId],
  );

  if (!allowed) return null;

  async function sendText(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !csrf) return;
    if (!activePeerId) {
      setError("اختر مستلماً من القائمة");
      return;
    }
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
    await load({ markRead: true });
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
    await load({ markRead: true });
  }

  async function startRecording() {
    setError("");
    if (!activePeerId) {
      setError("اختر مستلماً من القائمة");
      return;
    }
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
        form.append("receiverId", activePeerId!);
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
        await load({ markRead: true });
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

  function PeerList({
    title,
    items,
  }: {
    title: string;
    items: Thread[];
  }) {
    if (items.length === 0) return null;
    return (
      <div>
        <p className="sticky top-0 bg-[#F7FAFC] px-2 py-1.5 text-[10px] font-bold text-teal">
          {title} · {toLatinDigits(items.length)}
        </p>
        {items.map((t) => (
          <button
            key={t.peerId}
            type="button"
            onClick={() => setActivePeerId(t.peerId)}
            className={cn(
              "w-full border-b border-border px-2 py-2.5 text-right",
              activePeerId === t.peerId
                ? "bg-soft-teal/50"
                : "hover:bg-white",
            )}
          >
            <p className="truncate text-xs font-bold text-navy">{t.peerName}</p>
            <p className="truncate text-[10px] text-muted">{t.peerRoleLabel}</p>
            {t.unread > 0 ? (
              <span className="mt-1 inline-block rounded-full bg-teal px-1.5 text-[10px] text-white">
                {toLatinDigits(t.unread)}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    );
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
            {unread > 9 ? "9+" : toLatinDigits(unread)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed bottom-24 left-5 z-50 flex h-[min(580px,78vh)] w-[min(420px,94vw)] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-navy px-4 py-3 text-white">
            <div>
              <p className="text-sm font-bold">دردشة الطاقم</p>
              <p className="text-xs text-white/70">
                {meName || "…"} · أطباء وسكرتارية
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex gap-1 border-b border-border bg-[#F7FAFC] p-1.5">
            {(
              [
                ["ALL", "الكل"],
                ["DOCTORS", "أطباء"],
                ["SECRETARIES", "سكرتارية"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition",
                  filter === key
                    ? "bg-teal text-white"
                    : "text-navy hover:bg-white",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex min-h-0 flex-1">
            <aside className="w-[40%] overflow-y-auto border-l border-border bg-[#F7FAFC]">
              {visible.length === 0 ? (
                <p className="p-3 text-xs text-muted">لا جهات اتصال هنا</p>
              ) : (
                <>
                  <PeerList title="الأطباء" items={doctors} />
                  <PeerList title="السكرتارية" items={secretaries} />
                </>
              )}
            </aside>

            <section className="flex min-w-0 flex-1 flex-col">
              <div className="border-b border-border px-3 py-2">
                {active ? (
                  <>
                    <p className="text-sm font-bold text-navy">{active.peerName}</p>
                    <p className="text-[11px] text-muted">
                      {active.peerRoleLabel}
                      {active.group === "DOCTORS" ? " · تواصل أطباء" : ""}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted">
                    اختر طبيباً أو سكرتيراً من القائمة
                  </p>
                )}
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
                {!active ? (
                  <p className="text-center text-xs text-muted">
                    ابدأ محادثة منظمة مع زميل أو السكرتارية
                  </p>
                ) : active.messages.length === 0 ? (
                  <p className="text-center text-xs text-muted">
                    لا رسائل بعد — اكتب أول رسالة
                  </p>
                ) : (
                  active.messages.map((m) => (
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
                          <audio
                            controls
                            src={m.audioUrl}
                            className="w-full max-w-[220px]"
                          />
                          <button
                            type="button"
                            onClick={() => void deleteMessage(m.id, "VOICE")}
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-semibold",
                              m.mine
                                ? "text-white/85 hover:text-white"
                                : "text-danger hover:underline",
                            )}
                          >
                            <Trash2 className="h-3 w-3" />
                            حذف الصوت
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="whitespace-pre-wrap break-words">
                            {m.body}
                          </p>
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
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={sendText} className="border-t border-border p-2">
                <div className="flex items-end gap-1">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={2}
                    disabled={!activePeerId}
                    placeholder={
                      activePeerId
                        ? "اكتب رسالة…"
                        : "اختر مستلماً أولاً…"
                    }
                    className="min-h-[44px] flex-1 resize-none rounded-xl border border-border px-2 py-1.5 text-sm outline-none focus:border-teal disabled:bg-[#F7FAFC]"
                  />
                  <button
                    type="button"
                    onClick={recording ? stopRecording : startRecording}
                    disabled={loading || !csrf || !activePeerId}
                    className={cn(
                      "rounded-xl p-2 text-white disabled:opacity-50",
                      recording ? "bg-danger" : "bg-navy",
                    )}
                    aria-label={recording ? "إيقاف التسجيل" : "تسجيل صوت"}
                  >
                    {recording ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !text.trim() || !activePeerId}
                    className="rounded-xl bg-teal p-2 text-white disabled:opacity-50"
                    aria-label="إرسال"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                {error ? (
                  <p className="mt-1 text-xs text-danger">{error}</p>
                ) : null}
                {recording ? (
                  <p className="mt-1 text-xs font-semibold text-danger">
                    جاري التسجيل… اضغط الإيقاف للإرسال
                  </p>
                ) : null}
              </form>
            </section>
          </div>
        </div>
      ) : null}
    </>
  );
}
