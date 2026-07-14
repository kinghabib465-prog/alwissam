import { dayOfWeekAr } from "@/lib/days-ar";

export type WeekDay =
  | "SUNDAY"
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY";

export const JS_DAY_TO_ENUM: WeekDay[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export type DoctorAvailability = {
  doctorId: string;
  doctorName: string;
  /** أيام العمل النشطة (بدون تكرار) */
  workDays: WeekDay[];
  workDaysAr: string[];
  /** نوافذ الوقت لكل يوم: HH:mm */
  windowsByDay: Record<string, { start: string; end: string }[]>;
};

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function fromMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isWorkingDay(date: Date, workDays: WeekDay[]): boolean {
  const day = JS_DAY_TO_ENUM[date.getDay()];
  return workDays.includes(day);
}

export function dateToYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ymdToLocalDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

/** أقرب يوم عمل من اليوم (+offset أيام اختيارية) */
export function nextWorkingYmd(
  workDays: WeekDay[],
  fromOffsetDays = 0,
  maxLookAhead = 60,
): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + fromOffsetDays);
  for (let i = 0; i < maxLookAhead; i++) {
    if (isWorkingDay(d, workDays)) return dateToYmd(d);
    d.setDate(d.getDate() + 1);
  }
  return dateToYmd(new Date());
}

/** فتحات 30 دقيقة ضمن نوافذ العمل ليوم معيّن */
export function slotsForDate(
  ymd: string,
  windowsByDay: DoctorAvailability["windowsByDay"],
  stepMinutes = 30,
): string[] {
  const day = JS_DAY_TO_ENUM[ymdToLocalDate(ymd).getDay()];
  const windows = windowsByDay[day] || [];
  const slots: string[] = [];
  for (const w of windows) {
    let t = toMinutes(w.start);
    const end = toMinutes(w.end);
    while (t + stepMinutes <= end) {
      slots.push(fromMinutes(t));
      t += stepMinutes;
    }
  }
  return [...new Set(slots)].sort();
}

export function workDayButtons(
  workDays: WeekDay[],
  count = 10,
): { ymd: string; label: string; dayAr: string }[] {
  const out: { ymd: string; label: string; dayAr: string }[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  let offset = 0;
  while (out.length < count && offset < 90) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    if (isWorkingDay(d, workDays)) {
      const ymd = dateToYmd(d);
      const day = JS_DAY_TO_ENUM[d.getDay()];
      const dayAr = dayOfWeekAr[day] || day;
      let label = `${dayAr} ${ymd.slice(5)}`;
      if (offset === 0) label = `اليوم (${dayAr})`;
      else if (offset === 1) label = `غداً (${dayAr})`;
      else if (offset === 2) label = `بعد غد (${dayAr})`;
      out.push({ ymd, label, dayAr });
    }
    offset += 1;
  }
  return out;
}
