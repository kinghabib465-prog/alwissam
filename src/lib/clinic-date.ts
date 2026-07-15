import { toLatinDigits } from "@/lib/latin-digits";
import {
  periodFromStartAt,
  SHIFT_LABEL_AR,
  type WorkShift,
} from "@/lib/doctor-availability";

/** أشهر جزائرية شائعة (فرنسية معرّبة) */
export const ALGERIAN_MONTHS = [
  "جانفي",
  "فيفري",
  "مارس",
  "أفريل",
  "ماي",
  "جوان",
  "جويلية",
  "أوت",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
] as const;

const WEEKDAYS_AR = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
] as const;

function algiersParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
  };
}

function algiersWeekdayIndex(date: Date): number {
  const { year, month, day } = algiersParts(date);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
}

/** بناء تاريخ/وقت بتوقيت الجزائر (+01:00) من يوم YYYY-MM-DD وساعة HH:mm */
export function algiersDateTime(ymd: string, hhmm: string): Date {
  const [hh, mm] = hhmm.split(":").map(Number);
  const h = String(Number.isFinite(hh) ? hh : 8).padStart(2, "0");
  const m = String(Number.isFinite(mm) ? mm : 0).padStart(2, "0");
  return new Date(`${ymd}T${h}:${m}:00+01:00`);
}

/** بداية ونهاية يوم بتوقيت الجزائر لسلسلة ymd */
export function algiersYmdBounds(ymd: string) {
  const start = new Date(`${ymd}T00:00:00+01:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** مثال: 20 جويلية 2026 */
export function formatClinicDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const { year, month, day } = algiersParts(d);
  const monthName = ALGERIAN_MONTHS[month - 1] || "";
  return toLatinDigits(`${day} ${monthName} ${year}`);
}

/** موعد باليوم — مثال: يوم الإثنين 20 جويلية 2026 */
export function formatClinicAppointmentDay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const { year, month, day } = algiersParts(d);
  const weekday = WEEKDAYS_AR[algiersWeekdayIndex(d)] || "";
  const monthName = ALGERIAN_MONTHS[month - 1] || "";
  return toLatinDigits(`يوم ${weekday} ${day} ${monthName} ${year}`);
}

/** موعد مع الفترة — يوم … — صباح/مساء */
export function formatClinicAppointmentPeriod(
  date: Date | string,
  shift?: WorkShift | null,
): string {
  const day = formatClinicAppointmentDay(date);
  const period = SHIFT_LABEL_AR[shift || periodFromStartAt(date)] || "";
  return period ? `${day} — ${period}` : day;
}

/** من ymd مثل 2026-07-20 */
export function formatClinicDateYmd(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  return formatClinicDate(algiersDateTime(ymd, "12:00"));
}
