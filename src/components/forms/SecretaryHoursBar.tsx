"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";
import { SHIFT_PRESETS } from "@/lib/secretary-shift";
import { toLatinDigits } from "@/lib/latin-digits";

export function EditSecretaryLoginForm({
  userId,
  initialEmail,
  initialPhone,
  csrfToken,
}: {
  userId: string;
  initialEmail: string;
  initialPhone: string;
  csrfToken: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    email: initialEmail,
    phone: initialPhone,
    newPassword: "",
  });

  async function save() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/secretaries", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ section: "login", userId, ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "فشل");
        return;
      }
      setMsg("تم التحديث");
      setForm((f) => ({ ...f, newPassword: "" }));
      router.refresh();
    } catch {
      setMsg("تعذر الاتصال");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
        تعديل الدخول
      </Button>
      {open && (
        <div className="mt-2 space-y-2 rounded-xl border border-border bg-white p-3">
          <FormField label="البريد (اليوزر)">
            <Input
              className="font-latin"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </FormField>
          <FormField label="الهاتف">
            <Input
              className="font-latin"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </FormField>
          <FormField label="كلمة سر جديدة">
            <Input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            />
          </FormField>
          <Button size="sm" variant="teal" loading={loading} onClick={save}>
            حفظ
          </Button>
          {msg && <p className="font-latin text-xs text-teal">{msg}</p>}
        </div>
      )}
    </div>
  );
}

export function SecretaryHoursBar({
  userId,
  name,
  email,
  phone,
  shiftCode,
  workStartTime,
  workEndTime,
  csrfToken,
  status,
  onDelete,
}: {
  userId: string;
  name: string;
  email: string;
  phone: string;
  shiftCode: string;
  workStartTime: string;
  workEndTime: string;
  csrfToken: string;
  status?: string;
  onDelete?: React.ReactNode;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shift, setShift] = useState(shiftCode || "MORNING");
  const [start, setStart] = useState(workStartTime || "07:00");
  const [end, setEnd] = useState(workEndTime || "14:30");
  const [msg, setMsg] = useState("");

  async function saveHours(nextShift: string, nextStart: string, nextEnd: string) {
    setLoading(true);
    setMsg("");
    setShift(nextShift);
    setStart(nextStart);
    setEnd(nextEnd);
    try {
      const res = await fetch("/api/admin/secretaries", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          section: "hours",
          userId,
          shiftCode: nextShift,
          workStartTime: nextStart,
          workEndTime: nextEnd,
          workDays: "SUN,MON,TUE,WED,THU,SAT",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "فشل الحفظ — أعد تشغيل السيرفر إن لزم");
        return;
      }
      setMsg("تم حفظ أوقات العمل");
      router.refresh();
    } catch {
      setMsg("تعذر الاتصال");
    } finally {
      setLoading(false);
    }
  }

  const shiftLabel =
    shift === "EVENING"
      ? SHIFT_PRESETS.EVENING.label
      : shift === "MORNING"
        ? SHIFT_PRESETS.MORNING.label
        : "مخصص";

  return (
    <div className="rounded-2xl border border-border bg-white">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button
          type="button"
          className="min-w-0 flex-1 text-right"
          onClick={() => setExpanded((v) => !v)}
        >
          <p className="font-semibold text-navy">{name}</p>
          <p className="font-latin text-xs text-muted">
            {email} · {phone}
          </p>
          {status && status !== "ACTIVE" && (
            <p className="mt-0.5 text-xs font-semibold text-danger">
              {status === "LOCKED"
                ? "مقفول (محاولات دخول فاشلة) — يمكن حذفه أو تعديل الدخول"
                : status === "INACTIVE"
                  ? "معطّل"
                  : status}
            </p>
          )}
        </button>
        <span className="font-latin rounded-full bg-soft-teal px-2.5 py-1 text-xs text-teal">
          {shiftLabel} {toLatinDigits(workStartTime)}-{toLatinDigits(workEndTime)}
        </span>
        <Button size="sm" variant="teal" onClick={() => setHoursOpen((v) => !v)}>
          أوقات العمل
        </Button>
        {onDelete}
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3">
          <EditSecretaryLoginForm
            userId={userId}
            initialEmail={email}
            initialPhone={phone}
            csrfToken={csrfToken}
          />
        </div>
      )}

      {hoursOpen && (
        <div className="space-y-3 border-t border-border px-4 py-3">
          <p className="text-sm font-semibold text-navy">
            اختر الوردية (يُحفظ مباشرة)
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={shift === "MORNING" ? "teal" : "outline"}
              loading={loading}
              className="font-latin"
              onClick={() =>
                saveHours(
                  "MORNING",
                  SHIFT_PRESETS.MORNING.start,
                  SHIFT_PRESETS.MORNING.end,
                )
              }
            >
              صباحي ({SHIFT_PRESETS.MORNING.start}–{SHIFT_PRESETS.MORNING.end})
            </Button>
            <Button
              size="sm"
              variant={shift === "EVENING" ? "teal" : "outline"}
              loading={loading}
              className="font-latin"
              onClick={() =>
                saveHours(
                  "EVENING",
                  SHIFT_PRESETS.EVENING.start,
                  SHIFT_PRESETS.EVENING.end,
                )
              }
            >
              مسائي ({SHIFT_PRESETS.EVENING.start}–{SHIFT_PRESETS.EVENING.end})
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">مخصص:</span>
            <Input
              className="font-latin h-9 w-28"
              type="time"
              lang="en"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
            <span className="text-xs text-muted">إلى</span>
            <Input
              className="font-latin h-9 w-28"
              type="time"
              lang="en"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              loading={loading}
              onClick={() => saveHours("CUSTOM", start, end)}
            >
              حفظ المخصص
            </Button>
          </div>
          {msg && <p className="font-latin text-xs text-teal">{msg}</p>}
        </div>
      )}
    </div>
  );
}
