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

const DEFAULT_MORNING = { startTime: "08:00", endTime: "13:30", isActive: false };
const DEFAULT_EVENING = { startTime: "17:00", endTime: "21:00", isActive: false };

function buildDayState(initialHours: HourRow[]): DayShiftState[] {
  return DAYS_ORDER.map((day) => {
    const morning =
      initialHours.find(
        (h) => h.dayOfWeek === day && h.shift === "MORNING",
      ) ||
      // دعم قديم: دوام DAY يُعرض كصباحي
      initialHours.find((h) => h.dayOfWeek === day && h.shift === "DAY");
    const evening = initialHours.find(
      (h) => h.dayOfWeek === day && h.shift === "EVENING",
    );
    return {
      dayOfWeek: day,
      morning: morning
        ? {
            startTime: morning.startTime || DEFAULT_MORNING.startTime,
            endTime: morning.endTime || DEFAULT_MORNING.endTime,
            isActive: !!morning.isActive,
          }
        : { ...DEFAULT_MORNING },
      evening: evening
        ? {
            startTime: evening.startTime || DEFAULT_EVENING.startTime,
            endTime: evening.endTime || DEFAULT_EVENING.endTime,
            isActive: !!evening.isActive,
          }
        : { ...DEFAULT_EVENING },
    };
  });
}

/** محرر دوام مخصص: لكل يوم صباحي + مسائي منفصلان */
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
  /** مهمل — يُحفظ للتوافق مع الاستدعاءات القديمة */
  defaultShift?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [days, setDays] = useState<DayShiftState[]>(() =>
    buildDayState(initialHours),
  );

  const summary = useMemo(() => {
    const parts: string[] = [];
    for (const d of days) {
      const label = dayOfWeekAr[d.dayOfWeek] || d.dayOfWeek;
      if (d.morning.isActive) {
        parts.push(
          `${label} صباح ${toLatinDigits(d.morning.startTime)}–${toLatinDigits(d.morning.endTime)}`,
        );
      }
      if (d.evening.isActive) {
        parts.push(
          `${label} مساء ${toLatinDigits(d.evening.startTime)}–${toLatinDigits(d.evening.endTime)}`,
        );
      }
    }
    return parts;
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
        startTime: d.morning.startTime,
        endTime: d.morning.endTime,
        isActive: d.morning.isActive,
      });
      hours.push({
        dayOfWeek: d.dayOfWeek,
        shift: "EVENING",
        startTime: d.evening.startTime,
        endTime: d.evening.endTime,
        isActive: d.evening.isActive,
      });
      // تعطيل دوام DAY القديم إن وُجد
      hours.push({
        dayOfWeek: d.dayOfWeek,
        shift: "DAY",
        startTime: "09:00",
        endTime: "17:00",
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
        لكل يوم: دوام صباحي و/أو مسائي — اختاري الأيام والساعات لكل فترة
      </p>

      <div className="mb-2 hidden grid-cols-[7rem_1fr_1fr] gap-2 text-xs font-bold text-muted sm:grid">
        <span>اليوم</span>
        <span className="text-center">صباحي</span>
        <span className="text-center">مسائي</span>
      </div>

      <div className="space-y-3">
        {days.map((d) => (
          <div
            key={d.dayOfWeek}
            className="grid gap-2 rounded-xl border border-border/80 bg-[#F8FBFC] p-2.5 sm:grid-cols-[7rem_1fr_1fr] sm:items-center"
          >
            <p className="text-sm font-bold text-navy">
              {dayOfWeekAr[d.dayOfWeek]}
            </p>

            <label className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-2 py-2 text-sm ring-1 ring-border">
              <input
                type="checkbox"
                checked={d.morning.isActive}
                onChange={(e) =>
                  patchDay(d.dayOfWeek, "morning", {
                    isActive: e.target.checked,
                  })
                }
              />
              <span className="font-semibold text-teal sm:hidden">صباح</span>
              <Input
                className="font-latin h-9 w-[5.5rem]"
                type="time"
                value={d.morning.startTime}
                disabled={!d.morning.isActive}
                onChange={(e) =>
                  patchDay(d.dayOfWeek, "morning", {
                    startTime: e.target.value,
                  })
                }
              />
              <span className="text-xs text-muted">إلى</span>
              <Input
                className="font-latin h-9 w-[5.5rem]"
                type="time"
                value={d.morning.endTime}
                disabled={!d.morning.isActive}
                onChange={(e) =>
                  patchDay(d.dayOfWeek, "morning", {
                    endTime: e.target.value,
                  })
                }
              />
            </label>

            <label className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-2 py-2 text-sm ring-1 ring-border">
              <input
                type="checkbox"
                checked={d.evening.isActive}
                onChange={(e) =>
                  patchDay(d.dayOfWeek, "evening", {
                    isActive: e.target.checked,
                  })
                }
              />
              <span className="font-semibold text-teal sm:hidden">مساء</span>
              <Input
                className="font-latin h-9 w-[5.5rem]"
                type="time"
                value={d.evening.startTime}
                disabled={!d.evening.isActive}
                onChange={(e) =>
                  patchDay(d.dayOfWeek, "evening", {
                    startTime: e.target.value,
                  })
                }
              />
              <span className="text-xs text-muted">إلى</span>
              <Input
                className="font-latin h-9 w-[5.5rem]"
                type="time"
                value={d.evening.endTime}
                disabled={!d.evening.isActive}
                onChange={(e) =>
                  patchDay(d.dayOfWeek, "evening", {
                    endTime: e.target.value,
                  })
                }
              />
            </label>
          </div>
        ))}
      </div>

      {summary.length > 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          النشط: {summary.join(" · ")}
        </p>
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
