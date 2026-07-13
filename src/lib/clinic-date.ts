import { toLatinDigits } from "@/lib/latin-digits";

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

/** مثال: 20 جويلية 2026 */
export function formatClinicDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDate();
  const month = ALGERIAN_MONTHS[d.getMonth()] || "";
  const year = d.getFullYear();
  return toLatinDigits(`${day} ${month} ${year}`);
}

/** موعد باليوم فقط — مثال: يوم الإثنين 20 جويلية 2026 */
export function formatClinicAppointmentDay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const weekday = WEEKDAYS_AR[d.getDay()] || "";
  const day = d.getDate();
  const month = ALGERIAN_MONTHS[d.getMonth()] || "";
  const year = d.getFullYear();
  return toLatinDigits(`يوم ${weekday} ${day} ${month} ${year}`);
}

/** من ymd مثل 2026-07-20 */
export function formatClinicDateYmd(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [y, m, day] = ymd.split("-").map(Number);
  const d = new Date(y!, m! - 1, day!, 12, 0, 0, 0);
  return formatClinicDate(d);
}
