import { dayOfWeekAr } from "@/lib/days-ar";

export type WeekDay =
  | "SUNDAY"
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY";

export type WorkShift = "MORNING" | "EVENING" | "DAY";

export const JS_DAY_TO_ENUM: WeekDay[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export const SHIFT_LABEL_AR: Record<WorkShift, string> = {
  MORNING: "صباح",
  EVENING: "مساء",
  DAY: "اليوم",
};

export type WorkWindow = {
  start: string;
  end: string;
  shift: WorkShift;
};

export type DoctorAvailability = {
  doctorId: string;
  doctorName: string;
  /** أيام العمل النشطة (بدون تكرار) */
  workDays: WeekDay[];
  workDaysAr: string[];
  /** نوافذ الوقت لكل يوم مع الفترة */
  windowsByDay: Record<string, WorkWindow[]>;
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

export function normalizeShift(raw: string | null | undefined): WorkShift {
  const s = String(raw || "").toUpperCase();
  if (s === "EVENING") return "EVENING";
  if (s === "DAY") return "DAY";
  return "MORNING";
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

export function windowsOnDate(
  ymd: string,
  windowsByDay: DoctorAvailability["windowsByDay"],
): WorkWindow[] {
  const day = JS_DAY_TO_ENUM[ymdToLocalDate(ymd).getDay()];
  return windowsByDay[day] || [];
}

/** فترات متاحة في يوم معيّن */
export function shiftsForDate(
  ymd: string,
  windowsByDay: DoctorAvailability["windowsByDay"],
): WorkShift[] {
  const windows = windowsOnDate(ymd, windowsByDay);
  const order: WorkShift[] = ["MORNING", "DAY", "EVENING"];
  const set = new Set(windows.map((w) => normalizeShift(w.shift)));
  return order.filter((s) => set.has(s));
}

export function windowForShift(
  ymd: string,
  windowsByDay: DoctorAvailability["windowsByDay"],
  shift: WorkShift,
): WorkWindow | null {
  const windows = windowsOnDate(ymd, windowsByDay).filter(
    (w) => normalizeShift(w.shift) === shift,
  );
  if (windows.length === 0) return null;
  return [...windows].sort(
    (a, b) => toMinutes(a.start) - toMinutes(b.start),
  )[0]!;
}

/** فتحات 30 دقيقة ضمن نوافذ العمل ليوم معيّن (اختيارياً لفترة واحدة) */
export function slotsForDate(
  ymd: string,
  windowsByDay: DoctorAvailability["windowsByDay"],
  stepMinutes = 30,
  shift?: WorkShift | null,
): string[] {
  let windows = windowsOnDate(ymd, windowsByDay);
  if (shift) {
    windows = windows.filter((w) => normalizeShift(w.shift) === shift);
  }
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

/** تخمين الفترة من ساعة الموعد بتوقيت الجزائر */
export function periodFromStartAt(date: Date | string): WorkShift {
  const d = typeof date === "string" ? new Date(date) : date;
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Algiers",
      hour: "2-digit",
      hour12: false,
    }).format(d),
  );
  if (!Number.isFinite(hour)) return "MORNING";
  if (hour >= 16) return "EVENING";
  return "MORNING";
}
