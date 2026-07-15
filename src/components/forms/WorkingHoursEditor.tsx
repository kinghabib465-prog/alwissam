"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { dayOfWeekAr, DAYS_ORDER } from "@/lib/days-ar";
import { toLatinDigits } from "@/lib/latin-digits";

type HourRow = {
  dayOfWeek: string;
  shift: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

type DayShiftState = {
  dayOfWeek: string;
  morning: { startTime: string; endTime: string; isActive: boolean };
  evening: { startTime: string; endTime: string; isActive: boolean };
};

const DEFAULT_MORNING = {
  startTime: "07:00",
  endTime: "14:00",
  isActive: false,
};
const DEFAULT_EVENING = {
  startTime: "16:00",
  endTime: "22:00",
  isActive: false,
};

function latinTime(value: string) {
  return toLatinDigits(value || "");
}

function buildDayState(initialHours: HourRow[]): DayShiftState[] {
  return DAYS_ORDER.map((day) => {
    const morning =
      initialHours.find(
        (h) => h.dayOfWeek === day && h.shift === "MORNING",
      ) ||
      initialHours.find((h) => h.dayOfWeek === day && h.shift === "DAY");
    const evening = initialHours.find(
      (h) => h.dayOfWeek === day && h.shift === "EVENING",
    );
    return {
      dayOfWeek: day,
      morning: morning
        ? {
            startTime: latinTime(morning.startTime || DEFAULT_MORNING.startTime),
            endTime: latinTime(morning.endTime || DEFAULT_MORNING.endTime),
            isActive: !!morning.isActive,
          }
        : { ...DEFAULT_MORNING },
      evening: evening
        ? {
            startTime: latinTime(evening.startTime || DEFAULT_EVENING.startTime),
            endTime: latinTime(evening.endTime || DEFAULT_EVENING.endTime),
            isActive: !!evening.isActive,
          }
        : { ...DEFAULT_EVENING },
    };
  });
}

function ShiftBlock({
  label,
  active,
  startTime,
  endTime,
  onToggle,
  onStart,
  onEnd,
}: {
  label: string;
  active: boolean;
  startTime: string;
  endTime: string;
  onToggle: (v: boolean) => void;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-2.5 transition ${
        active ? "border-teal/40 ring-1 ring-teal/20" : "border-border opacity-80"
      }`}
    >
      <label className="mb-2 flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span className="text-sm font-bold text-navy">{label}</span>
      </label>
      <div className="flex flex-wrap items-center gap-1.5" dir="ltr">
        <Input
          className="font-latin h-9 w-[5.75rem] px-2 text-center"
          type="time"
          lang="en"
          value={startTime}
          disabled={!active}
          onChange={(e) => onStart(latinTime(e.target.value))}
        />
        <span className="text-xs text-muted">–</span>
        <Input
          className="font-latin h-9 w-[5.75rem] px-2 text-center"
          type="time"
          lang="en"
          value={endTime}
          disabled={!active}
          onChange={(e) => onEnd(latinTime(e.target.value))}
        />
      </div>
      {active ? (
        <p className="font-latin mt-1.5 text-[11px] tabular-nums text-teal">
          {latinTime(startTime)} – {latinTime(endTime)}
        </p>
      ) : (
        <p className="mt-1.5 text-[11px] text-muted">متوقف</p>
      )}
    </div>
  );
}

/** محرر دوام منظم: لكل يوم صباحي + مسائي — ساعات بأرقام غربية */
export function WorkingHoursEditor({
  csrfToken,
  doctorId,
  doctorName,
  initialHours,
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
  const [error, setError] = useState("");
  const [days, setDays] = useState<DayShiftState[]>(() =>
    buildDayState(initialHours),
  );

  const summaryRows = useMemo(() => {
    return days
      .map((d) => {
        const parts: string[] = [];
        if (d.morning.isActive) {
          parts.push(
            `صباح ${latinTime(d.morning.startTime)}–${latinTime(d.morning.endTime)}`,
          );
        }
        if (d.evening.isActive) {
          parts.push(
            `مساء ${latinTime(d.evening.startTime)}–${latinTime(d.evening.endTime)}`,
          );
        }
        if (parts.length === 0) return null;
        return {
          day: dayOfWeekAr[d.dayOfWeek] || d.dayOfWeek,
          text: parts.join(" · "),
        };
      })
      .filter(Boolean) as { day: string; text: string }[];
  }, [days]);

  function patchDay(
    dayOfWeek: string,
    which: "morning" | "evening",
    patch: Partial<DayShiftState["morning"]>,
  ) {
    setDays((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, [which]: { ...d[which], ...patch } }
          : d,
      ),
    );
  }

  async function save() {
    setLoading(true);
    setMsg("");
    setError("");

    for (const d of days) {
      for (const which of ["morning", "evening"] as const) {
        const block = d[which];
        if (!block.isActive) continue;
        if (!block.startTime || !block.endTime) {
          setLoading(false);
          setError("أكملي ساعات البداية والنهاية لكل فترة مفعّلة");
          return;
        }
        if (block.startTime >= block.endTime) {
          setLoading(false);
          setError(
            `وقت غير صالح في ${dayOfWeekAr[d.dayOfWeek]} (${which === "morning" ? "صباح" : "مساء"})`,
          );
          return;
        }
      }
    }

    const hours: HourRow[] = [];
    for (const d of days) {
      hours.push({
        dayOfWeek: d.dayOfWeek,
        shift: "MORNING",
        startTime: latinTime(d.morning.startTime),
        endTime: latinTime(d.morning.endTime),
        isActive: d.morning.isActive,
      });
      hours.push({
        dayOfWeek: d.dayOfWeek,
        shift: "EVENING",
        startTime: latinTime(d.evening.startTime),
        endTime: latinTime(d.evening.endTime),
        isActive: d.evening.isActive,
      });
      hours.push({
        dayOfWeek: d.dayOfWeek,
        shift: "DAY",
        startTime: "07:00",
        endTime: "14:00",
        isActive: false,
      });
    }

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
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "فشل الحفظ");
      return;
    }
    setMsg("تم حفظ الدوام الصباحي والمسائي");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="mb-1 font-bold text-navy">{doctorName}</p>
      <p className="mb-3 text-xs text-muted">
        جدول منظم لكل يوم — فعّل صباحي و/أو مسائي وعدّل الساعات
        <span className="font-latin mx-1 tabular-nums text-teal">
          ({latinTime(DEFAULT_MORNING.startTime)}–{latinTime(DEFAULT_MORNING.endTime)}
          {" · "}
          {latinTime(DEFAULT_EVENING.startTime)}–{latinTime(DEFAULT_EVENING.endTime)})
        </span>
      </p>

      <div className="mb-2 hidden grid-cols-[6.5rem_1fr_1fr] gap-2 px-1 text-xs font-bold text-muted sm:grid">
        <span>اليوم</span>
        <span>صباحي</span>
        <span>مسائي</span>
      </div>

      <div className="space-y-2.5">
        {days.map((d, index) => (
          <div
            key={d.dayOfWeek}
            className="grid gap-2 rounded-2xl border border-border/80 bg-[#F8FBFC] p-2.5 sm:grid-cols-[6.5rem_1fr_1fr] sm:items-start"
          >
            <div className="flex items-center gap-2 sm:pt-2">
              <span className="font-latin flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-teal ring-1 ring-border">
                {toLatinDigits(index + 1)}
              </span>
              <p className="text-sm font-bold text-navy">
                {dayOfWeekAr[d.dayOfWeek]}
              </p>
            </div>

            <ShiftBlock
              label="صباحي"
              active={d.morning.isActive}
              startTime={d.morning.startTime}
              endTime={d.morning.endTime}
              onToggle={(v) =>
                patchDay(d.dayOfWeek, "morning", { isActive: v })
              }
              onStart={(v) =>
                patchDay(d.dayOfWeek, "morning", { startTime: v })
              }
              onEnd={(v) => patchDay(d.dayOfWeek, "morning", { endTime: v })}
            />

            <ShiftBlock
              label="مسائي"
              active={d.evening.isActive}
              startTime={d.evening.startTime}
              endTime={d.evening.endTime}
              onToggle={(v) =>
                patchDay(d.dayOfWeek, "evening", { isActive: v })
              }
              onStart={(v) =>
                patchDay(d.dayOfWeek, "evening", { startTime: v })
              }
              onEnd={(v) => patchDay(d.dayOfWeek, "evening", { endTime: v })}
            />
          </div>
        ))}
      </div>

      {summaryRows.length > 0 ? (
        <div className="mt-3 rounded-xl border border-border bg-white px-3 py-2">
          <p className="mb-1.5 text-xs font-bold text-navy">الملخص النشط</p>
          <ul className="space-y-1">
            {summaryRows.map((row) => (
              <li
                key={row.day}
                className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted"
              >
                <span className="font-semibold text-navy">{row.day}</span>
                <span className="font-latin tabular-nums">{row.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-xs text-danger">لا فترات مفعّلة بعد</p>
      )}

      <Button
        className="mt-3"
        size="sm"
        variant="teal"
        loading={loading}
        onClick={save}
      >
        حفظ الدوام (صباح / مساء)
      </Button>
      {msg && <p className="mt-2 text-xs font-semibold text-teal">{msg}</p>}
      {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}
