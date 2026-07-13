"use client";

import { useEffect, useState } from "react";
import { toLatinDigits } from "@/lib/latin-digits";

function pad(n: number) {
  return toLatinDigits(String(n).padStart(2, "0"));
}

/**
 * عدّاد حتى يوم الموعد (بداية اليوم 00:00) — وليس حتى ساعة دخول الطبيب.
 * dayOnly=true: يعرض أيام + ساعات + دقائق حتى يحلّ يوم الموعد.
 */
export function AppointmentCountdown({
  targetIso,
  dayOnly = false,
}: {
  /** أي وقت في يوم الموعد — يُستخدم تاريخ اليوم فقط عند dayOnly */
  targetIso: string;
  dayOnly?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const raw = new Date(targetIso);
  const dayStart = new Date(raw);
  dayStart.setHours(0, 0, 0, 0);

  // الهدف = بداية يوم الموعد فقط (لا ساعة الطبيب)
  const target = dayOnly ? dayStart.getTime() : raw.getTime();
  const diff = Math.max(0, target - now);

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const isAppointmentDay =
    dayOnly && todayStart.getTime() === dayStart.getTime();

  if (dayOnly && (diff <= 0 || isAppointmentDay)) {
    return (
      <div className="rounded-2xl bg-soft-teal p-4 text-center">
        <p className="text-sm text-muted">يوم الموعد</p>
        <p className="mt-1 text-xl font-bold text-teal">
          موعدك اليوم — اتصل بالعيادة إن احتجت
        </p>
      </div>
    );
  }

  if (!dayOnly && diff <= 0) {
    return (
      <div className="rounded-2xl bg-soft-teal p-4 text-center">
        <p className="text-sm text-muted">موعد الحصة</p>
        <p className="mt-1 text-xl font-bold text-teal">حان وقت الحصة</p>
      </div>
    );
  }

  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (dayOnly) {
    const totalHours = Math.floor(totalSec / 3600);
    return (
      <div className="rounded-2xl border border-teal/30 bg-gradient-to-l from-soft-teal to-white p-5 text-center">
        <p className="text-sm font-medium text-muted">
          متبقّي حتى يوم الموعد
        </p>
        <p className="mt-1 text-[11px] text-muted">
          العدّ حتى بداية اليوم — وليس ساعة دخول الطبيب
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            [days, "يوم"],
            [hours, "ساعة"],
            [minutes, "دقيقة"],
          ].map(([value, label]) => (
            <div
              key={String(label)}
              className="rounded-2xl bg-white p-3 shadow-sm"
            >
              <p className="font-latin text-2xl font-bold text-navy">
                {pad(Number(value))}
              </p>
              <p className="mt-1 text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
        <p className="font-latin mt-3 text-sm font-semibold text-teal">
          حوالي {toLatinDigits(String(totalHours))} ساعة حتى يوم الموعد
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-teal/30 bg-gradient-to-l from-soft-teal to-white p-5 text-center">
      <p className="text-sm font-medium text-muted">العد التنازلي للحصة المقبلة</p>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          [days, "يوم"],
          [hours, "ساعة"],
          [minutes, "دقيقة"],
          [seconds, "ثانية"],
        ].map(([value, label]) => (
          <div key={String(label)} className="rounded-2xl bg-white p-3 shadow-sm">
            <p className="font-latin text-2xl font-bold text-navy">
              {pad(Number(value))}
            </p>
            <p className="mt-1 text-xs text-muted">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
