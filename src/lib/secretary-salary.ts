/** يوم راتب لكل سكرتير (1–31). يوم 31 = آخر يوم في الأشهر الأقصر. */

export function algiersTodayParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function algiersYearMonth(now = new Date()): string {
  const { year, month } = algiersTodayParts(now);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** هل اليوم (بتوقيت الجزائر) هو يوم دفع هذا السكرتير؟ */
export function isSalaryDayDue(
  salaryDayOfMonth: number | null | undefined,
  now = new Date(),
): boolean {
  if (
    salaryDayOfMonth == null ||
    !Number.isFinite(salaryDayOfMonth) ||
    salaryDayOfMonth < 1 ||
    salaryDayOfMonth > 31
  ) {
    return false;
  }
  const { year, month, day } = algiersTodayParts(now);
  const dim = daysInMonth(year, month);
  const dueDay = Math.min(Math.floor(salaryDayOfMonth), dim);
  return day === dueDay;
}

/** يظهر الإشعار فقط إن حان يوم الراتب ولم يُضغط «تم الدفع» لهذا الشهر */
export function isSalaryReminderActive(
  salaryDayOfMonth: number | null | undefined,
  salaryPaidYearMonth: string | null | undefined,
  now = new Date(),
): boolean {
  if (!isSalaryDayDue(salaryDayOfMonth, now)) return false;
  const ym = algiersYearMonth(now);
  return salaryPaidYearMonth !== ym;
}

export function normalizeSalaryDay(raw: unknown): number | null {
  if (raw === "" || raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const day = Math.floor(n);
  if (day < 1 || day > 31) return null;
  return day;
}
