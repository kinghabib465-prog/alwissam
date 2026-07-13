"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { dayOfWeekAr, DAYS_ORDER } from "@/lib/days-ar";

type HourRow = {
  dayOfWeek: string;
  shift: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

export function WorkingHoursEditor({
  csrfToken,
  doctorId,
  doctorName,
  initialHours,
  defaultShift = "DAY",
}: {
  csrfToken: string;
  doctorId: string;
  doctorName: string;
  initialHours: HourRow[];
  defaultShift?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const byDay = DAYS_ORDER.map((day) => {
    const existing = initialHours.find((h) => h.dayOfWeek === day);
    return (
      existing || {
        dayOfWeek: day,
        shift: defaultShift,
        startTime: "09:00",
        endTime: "17:00",
        isActive: false,
      }
    );
  });

  const [hours, setHours] = useState<HourRow[]>(byDay);

  function update(i: number, patch: Partial<HourRow>) {
    setHours((prev) => prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  }

  async function save() {
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/admin/clinic-settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        section: "working_hours",
        doctorId,
        hours,
      }),
    });
    setLoading(false);
    setMsg(res.ok ? "تم حفظ المواعيد" : "فشل الحفظ");
    if (res.ok) router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="mb-3 font-bold text-navy">{doctorName}</p>
          <div className="space-y-2">
        {hours.map((h, i) => (
          <div
            key={h.dayOfWeek}
            className="flex flex-wrap items-center gap-2 text-sm"
          >
            <label className="flex min-w-[7rem] items-center gap-2">
              <input
                type="checkbox"
                checked={h.isActive}
                onChange={(e) => update(i, { isActive: e.target.checked })}
              />
              {dayOfWeekAr[h.dayOfWeek]}
            </label>
            <Input
              className="font-latin h-9 w-28"
              type="time"
              value={h.startTime}
              disabled={!h.isActive}
              onChange={(e) => update(i, { startTime: e.target.value })}
            />
            <span className="text-xs text-muted">إلى</span>
            <Input
              className="font-latin h-9 w-28"
              type="time"
              value={h.endTime}
              disabled={!h.isActive}
              onChange={(e) => update(i, { endTime: e.target.value })}
            />
          </div>
        ))}
      </div>
      <Button className="mt-3" size="sm" variant="teal" loading={loading} onClick={save}>
        حفظ مواعيد العمل
      </Button>
      {msg && <p className="mt-2 text-xs text-teal">{msg}</p>}
    </div>
  );
}
