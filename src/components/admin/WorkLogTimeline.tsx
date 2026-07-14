"use client";

import { useMemo, useState } from "react";
import type { WorkLogDay, WorkLogPayload } from "@/lib/work-log";
import { formatCurrencyDZD } from "@/lib/utils";
import { toLatinDigits } from "@/lib/latin-digits";
import { StatusBadge } from "@/components/ui/Card";

const RANGE_OPTIONS = [
  { key: "7", label: "7 أيام", days: 7 },
  { key: "30", label: "30 يوم", days: 30 },
  { key: "45", label: "45 يوم", days: 45 },
] as const;

function ymdDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function todayYmd() {
  return ymdDaysAgo(0);
}

/** سجل عمل: أيام قابلة للطي — اليوم مفتوح، الباقي مطوي */
export function WorkLogTimeline({ data }: { data: WorkLogPayload }) {
  const [range, setRange] = useState<"7" | "30" | "45">("30");
  const today = todayYmd();
  const [open, setOpen] = useState<Record<string, boolean>>({ [today]: true });

  const filtered = useMemo(() => {
    const opt = RANGE_OPTIONS.find((o) => o.key === range)!;
    const min = ymdDaysAgo(opt.days - 1);
    return data.days.filter((d) => d.ymd >= min);
  }, [data.days, range]);

  function toggle(ymd: string) {
    setOpen((prev) => ({ ...prev, [ymd]: !prev[ymd] }));
  }

  if (data.days.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-white p-6 text-center text-muted">
        لا يوجد سجل عمل في الفترة الأخيرة
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {RANGE_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setRange(o.key)}
            className={`rounded-2xl px-4 py-2 text-sm font-bold ${
              range === o.key
                ? "bg-teal text-white"
                : "bg-white text-navy ring-1 ring-border"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted">
        الترتيب: الأحدث أولاً · داخل اليوم حسب وقت الاستقبال · اضغط اليوم لفتح التفاصيل
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-white p-6 text-center text-muted">
          لا بيانات في هذه الفترة
        </p>
      ) : (
        filtered.map((day) => (
          <DayBlock
            key={day.ymd}
            day={day}
            isToday={day.ymd === today}
            expanded={!!open[day.ymd]}
            onToggle={() => toggle(day.ymd)}
          />
        ))
      )}
    </div>
  );
}

function DayBlock({
  day,
  isToday,
  expanded,
  onToggle,
}: {
  day: WorkLogDay;
  isToday: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
        isToday ? "border-teal/50" : "border-border"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-2 px-4 py-3 text-right hover:bg-[#F8FBFC] sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="font-bold text-navy">
            {day.dateLabel}
            {isToday ? (
              <span className="mr-2 rounded-full bg-teal/15 px-2 py-0.5 text-xs text-teal">
                اليوم
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-muted">
            مرضى:{" "}
            <span className="font-latin font-semibold">
              {toLatinDigits(day.patientsCount)}
            </span>
            {" · "}
            محصّل:{" "}
            <span className="font-semibold text-teal">
              {formatCurrencyDZD(day.paidTotal)}
            </span>
            {day.firstLogin ? (
              <>
                {" · "}
                دخول:{" "}
                <span className="font-latin">
                  {toLatinDigits(day.firstLogin)}
                  {day.lastLogin && day.lastLogin !== day.firstLogin
                    ? `–${toLatinDigits(day.lastLogin)}`
                    : ""}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {day.doctorsPresent
            .filter((d) => d.present)
            .slice(0, 4)
            .map((d) => (
              <StatusBadge
                key={d.doctorId}
                label={`${d.doctorName.split(" ").slice(-1)[0]} · ${formatCurrencyDZD(d.paidTotal)}`}
                tone="teal"
              />
            ))}
          <span className="rounded-full bg-soft-teal px-3 py-1 text-xs font-bold text-teal">
            {expanded ? "إخفاء" : "عرض"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3">
          {day.doctorsPresent.length > 0 && (
            <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {day.doctorsPresent.map((d) => (
                <div
                  key={d.doctorId}
                  className="rounded-xl border border-border bg-[#F8FBFC] p-3 text-sm"
                >
                  <p className="font-bold text-navy">{d.doctorName}</p>
                  <p className="mt-1 text-xs text-muted">
                    {d.present ? (
                      <span className="font-semibold text-teal">حاضر في العيادة</span>
                    ) : (
                      <span>غير ظاهر في الانتظار</span>
                    )}
                    {" · "}
                    مرضى:{" "}
                    <span className="font-latin">
                      {toLatinDigits(d.patientsCount)}
                    </span>
                    {" · "}
                    دفع: {formatCurrencyDZD(d.paidTotal)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {day.patients.length === 0 ? (
            <p className="text-sm text-muted">لا مرضى مستقبَلين في هذا اليوم</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-right text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="pb-2 font-semibold">#</th>
                    <th className="pb-2 font-semibold">وقت الاستقبال</th>
                    <th className="pb-2 font-semibold">المريض</th>
                    <th className="pb-2 font-semibold">الطبيب</th>
                    <th className="pb-2 font-semibold">الحالة</th>
                    <th className="pb-2 font-semibold">المدفوع</th>
                  </tr>
                </thead>
                <tbody>
                  {day.patients.map((p, i) => (
                    <tr key={p.id} className="border-t border-border/60">
                      <td className="py-2 font-latin text-muted">
                        {toLatinDigits(i + 1)}
                      </td>
                      <td className="py-2 font-latin font-semibold text-navy">
                        {toLatinDigits(p.arrivedTime)}
                      </td>
                      <td className="py-2">
                        <p className="font-semibold text-navy">{p.patientName}</p>
                        <p className="font-latin text-xs text-muted">
                          {toLatinDigits(p.phone)}
                        </p>
                      </td>
                      <td className="py-2 text-navy">{p.doctorName}</td>
                      <td className="py-2 text-xs text-muted">{statusAr(p.status)}</td>
                      <td className="py-2 font-semibold text-teal">
                        {p.paidAmount > 0
                          ? formatCurrencyDZD(p.paidAmount)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function statusAr(status: string) {
  const map: Record<string, string> = {
    WAITING: "انتظار",
    WITH_DOCTOR: "عند الطبيب",
    SESSION_DONE: "انتهت المعاينة",
    LEFT: "غادر",
    ARRIVED: "وصل",
  };
  return map[status] || status;
}
