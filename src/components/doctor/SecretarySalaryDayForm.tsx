"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";
import type { SecretarySalarySetting } from "@/lib/secretary-salary";

export function SecretarySalaryDayForm({
  csrfToken,
  initial,
}: {
  csrfToken: string;
  initial: SecretarySalarySetting;
}) {
  const router = useRouter();
  const [dayOfMonth, setDayOfMonth] = useState(
    initial.dayOfMonth ? String(initial.dayOfMonth) : "",
  );
  const [note, setNote] = useState(initial.note || "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setErr("");
    const day = dayOfMonth.trim() === "" ? 0 : Number(dayOfMonth);
    const res = await fetch("/api/admin/clinic-settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        section: "secretary_salary_day",
        dayOfMonth: day,
        note,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error || "فشل الحفظ");
      return;
    }
    setMsg(
      day >= 1
        ? `تم ضبط تذكير الراتب كل يوم ${day} من الشهر`
        : "تم إيقاف تذكير الراتب",
    );
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <p className="text-sm leading-6 text-muted">
        حدّدي يوم الشهر الذي يُدفع فيه راتب السكرتارية. في ذلك اليوم يظهر إشعار
        أعلى صفحة السكرتارية حتى لا يُنسى الدفع.
      </p>
      <FormField label="يوم الشهر (1–28) — اتركي فارغاً للإيقاف">
        <Input
          type="number"
          min={1}
          max={28}
          value={dayOfMonth}
          onChange={(e) => setDayOfMonth(e.target.value)}
          placeholder="مثال: 1 أو 25"
        />
      </FormField>
      <FormField label="ملاحظة (اختياري)">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="مثال: راتب سمار و…"
        />
      </FormField>
      <Button type="submit" size="sm" variant="teal" loading={loading}>
        حفظ يوم الراتب
      </Button>
      {msg && <p className="text-sm font-semibold text-teal">{msg}</p>}
      {err && (
        <p role="alert" className="text-sm text-danger">
          {err}
        </p>
      )}
    </form>
  );
}
