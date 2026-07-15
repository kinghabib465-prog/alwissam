"use client";

import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { formatClinicAppointmentDay, formatClinicDateYmd } from "@/lib/clinic-date";
import {
  SHIFT_LABEL_AR,
  type DoctorAvailability,
  type WorkShift,
  isWorkingDay,
  nextWorkingYmd,
  shiftsForDate,
  slotsForDate,
  windowForShift,
  ymdToLocalDate,
} from "@/lib/doctor-availability";
import { toLatinDigits } from "@/lib/latin-digits";

/**
 * اختيار يوم موعد (+ صباح/مساء) ضمن أيام عمل الطبيب.
 * dayOnly: بدون ساعة دقيقة — فقط الفترة.
 */
export function AppointmentDatePicker({
  availability,
  date,
  time = "10:00",
  shift,
  onDateChange,
  onTimeChange,
  onShiftChange,
  dayOnly = false,
}: {
  availability: DoctorAvailability;
  date: string;
  time?: string;
  shift?: WorkShift | null;
  onDateChange: (ymd: string) => void;
  onTimeChange?: (hhmm: string) => void;
  onShiftChange?: (shift: WorkShift) => void;
  dayOnly?: boolean;
}) {
  const availableShifts = useMemo(
    () => (date ? shiftsForDate(date, availability.windowsByDay) : []),
    [date, availability.windowsByDay],
  );

  const activeShift: WorkShift | null =
    shift && availableShifts.includes(shift)
      ? shift
      : availableShifts[0] || null;

  useEffect(() => {
    if (!onShiftChange || !date) return;
    if (availableShifts.length === 0) return;
    if (!shift || !availableShifts.includes(shift)) {
      onShiftChange(availableShifts[0]!);
    }
  }, [date, availableShifts, shift, onShiftChange]);

  const slots = useMemo(
    () =>
      !dayOnly && date
        ? slotsForDate(date, availability.windowsByDay, 30, activeShift)
        : [],
    [date, availability.windowsByDay, dayOnly, activeShift],
  );

  const windowHint =
    date && activeShift
      ? windowForShift(date, availability.windowsByDay, activeShift)
      : null;

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
    const nextShifts = shiftsForDate(ymd, availability.windowsByDay);
    const nextShift =
      shift && nextShifts.includes(shift) ? shift : nextShifts[0];
    if (nextShift && onShiftChange) onShiftChange(nextShift);
    if (!dayOnly && onTimeChange) {
      const nextSlots = slotsForDate(
        ymd,
        availability.windowsByDay,
        30,
        nextShift,
      );
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

  const showShiftPicker =
    dayOk &&
    availableShifts.length > 0 &&
    !(availableShifts.length === 1 && availableShifts[0] === "DAY");

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
          <span className="font-latin tabular-nums">
            {toLatinDigits(display)}
          </span>
          {dayOnly && activeShift && activeShift !== "DAY"
            ? ` — ${SHIFT_LABEL_AR[activeShift]}`
            : ""}
        </p>
        {dayOnly && dayOk && windowHint ? (
          <p className="mt-1 text-xs text-teal">
            فترة{" "}
            {SHIFT_LABEL_AR[activeShift || "MORNING"]}
            {" · "}
            دوام{" "}
            <span className="font-latin">
              {toLatinDigits(windowHint.start)}–
              {toLatinDigits(windowHint.end)}
            </span>
            {" — بدون ساعة دقيقة"}
          </p>
        ) : null}
        {!dayOk && date ? (
          <p className="mt-1 text-xs text-danger">
            هذا اليوم ليس من أيام عملك — اختر من الجدول فقط
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted">أيام عملك: {workDaysHint}</p>
      </div>

      {showShiftPicker ? (
        <div>
          <p className="mb-1 text-xs text-muted">الفترة</p>
          <div className="flex flex-wrap gap-2">
            {availableShifts
              .filter((s) => s !== "DAY")
              .map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={activeShift === s ? "teal" : "outline"}
                  onClick={() => onShiftChange?.(s)}
                >
                  {SHIFT_LABEL_AR[s]}
                </Button>
              ))}
          </div>
        </div>
      ) : null}

      {!dayOnly ? (
        <div>
          <p className="mb-1 text-xs text-muted">الساعة (ضمن الدوام)</p>
          <div className="flex flex-wrap gap-2">
            {slots.length === 0 ? (
              <p className="text-xs text-danger">لا ساعات في هذه الفترة</p>
            ) : (
              slots.map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={time === t ? "teal" : "outline"}
                  className="font-latin"
                  onClick={() => onTimeChange?.(t)}
                >
                  {toLatinDigits(t)}
                </Button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
