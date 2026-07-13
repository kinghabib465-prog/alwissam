"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { formatClinicAppointmentDay, formatClinicDateYmd } from "@/lib/clinic-date";
import {
  type DoctorAvailability,
  isWorkingDay,
  nextWorkingYmd,
  slotsForDate,
  ymdToLocalDate,
} from "@/lib/doctor-availability";

/**
 * اختيار يوم موعد ضمن أيام عمل الطبيب.
 * dayOnly: حجز باليوم فقط (بدون ساعات) — الافتراضي لمرضاي.
 */
export function AppointmentDatePicker({
  availability,
  date,
  time = "10:00",
  onDateChange,
  onTimeChange,
  dayOnly = false,
}: {
  availability: DoctorAvailability;
  date: string;
  time?: string;
  onDateChange: (ymd: string) => void;
  onTimeChange?: (hhmm: string) => void;
  dayOnly?: boolean;
}) {
  const slots = useMemo(
    () =>
      !dayOnly && date ? slotsForDate(date, availability.windowsByDay) : [],
    [date, availability.windowsByDay, dayOnly],
  );

  const display = date
    ? dayOnly
      ? formatClinicAppointmentDay(ymdToLocalDate(date))
      : formatClinicDateYmd(date)
    : "—";
  const dayOk = date
    ? isWorkingDay(ymdToLocalDate(date), availability.workDays)
    : false;

  function applyDate(ymd: string) {
    if (!ymd) return;
    const d = ymdToLocalDate(ymd);
    if (!isWorkingDay(d, availability.workDays)) {
      return;
    }
    onDateChange(ymd);
    if (!dayOnly && onTimeChange) {
      const nextSlots = slotsForDate(ymd, availability.windowsByDay);
      if (nextSlots.length && !nextSlots.includes(time)) {
        onTimeChange(nextSlots[0]!);
      }
    }
  }

  function snapToNextWorking() {
    const ymd = nextWorkingYmd(availability.workDays, 0);
    applyDate(ymd);
  }

  const workDaysHint =
    availability.workDaysAr.length > 0
      ? availability.workDaysAr.join(" · ")
      : "لا أيام عمل";

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border-2 border-teal/40 bg-soft-teal/20 p-3">
        <p className="mb-2 text-xs text-muted">
          {dayOnly ? "يوم الموعد" : "تاريخ الموعد"}
        </p>
        <Input
          className="font-latin h-11 w-full max-w-xs"
          type="date"
          lang="en"
          value={date}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            if (!isWorkingDay(ymdToLocalDate(v), availability.workDays)) {
              snapToNextWorking();
              return;
            }
            applyDate(v);
          }}
        />
        <p
          className={`mt-3 text-lg font-bold ${dayOk ? "text-navy" : "text-danger"}`}
          data-numeric="true"
        >
          {display}
        </p>
        {dayOnly && dayOk ? (
          <p className="mt-1 text-xs text-teal">الموعد لهذا اليوم بالكامل — بدون ساعة محددة</p>
        ) : null}
        {!dayOk && date ? (
          <p className="mt-1 text-xs text-danger">
            هذا اليوم ليس من أيام عملك — اختر من الجدول فقط
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted">أيام عملك: {workDaysHint}</p>
      </div>

      {!dayOnly ? (
        <div>
          <p className="mb-1 text-xs text-muted">الساعة (ضمن الدوام)</p>
          <div className="flex flex-wrap gap-2">
            {slots.length === 0 ? (
              <p className="text-xs text-danger">لا ساعات في هذا اليوم</p>
            ) : (
              slots.map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={time === t ? "teal" : "outline"}
                  className="font-latin"
                  onClick={() => onTimeChange?.(t)}
                >
                  {t}
                </Button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
