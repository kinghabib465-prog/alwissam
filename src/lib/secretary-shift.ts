/** هل السكرتير ضمن أوقات عمله الآن؟ (توقيت الجزائر) */
function parseHhMm(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function isWithinSecretaryShift(profile: {
  workStartTime: string;
  workEndTime: string;
  workDays: string;
}): { ok: boolean; message?: string } {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Africa/Algiers" }),
  );
  const dayMap = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const today = dayMap[now.getDay()]!;
  const days = profile.workDays
    .split(",")
    .map((d) => d.trim().toUpperCase())
    .filter(Boolean);

  if (days.length > 0 && !days.includes(today)) {
    return {
      ok: false,
      message: "اليوم خارج أيام عمل حساب السكرتارية",
    };
  }

  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = parseHhMm(profile.workStartTime);
  const end = parseHhMm(profile.workEndTime);

  if (minutes < start || minutes > end) {
    return {
      ok: false,
      message: `حسابك من ${profile.workStartTime} إلى ${profile.workEndTime} فقط`,
    };
  }

  return { ok: true };
}

export const SHIFT_PRESETS = {
  MORNING: {
    label: "صباحي",
    start: "07:00",
    end: "14:00",
    loginUntil: "14:00",
  },
  EVENING: {
    label: "مسائي",
    start: "16:00",
    end: "22:00",
    loginUntil: "22:00",
  },
} as const;

/** أيام الأسبوع — رموز التخزين + التسمية العربية */
export const WEEK_DAYS = [
  { code: "SUN", label: "الأحد" },
  { code: "MON", label: "الإثنين" },
  { code: "TUE", label: "الثلاثاء" },
  { code: "WED", label: "الأربعاء" },
  { code: "THU", label: "الخميس" },
  { code: "FRI", label: "الجمعة" },
  { code: "SAT", label: "السبت" },
] as const;

export type WeekDayCode = (typeof WEEK_DAYS)[number]["code"];

const VALID_DAY_CODES = new Set<string>(WEEK_DAYS.map((d) => d.code));

/** تحويل نص workDays المخزّن إلى قائمة رموز صالحة */
export function parseWorkDays(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((d) => d.trim().toUpperCase())
    .filter((d) => VALID_DAY_CODES.has(d));
}

/** تنظيف workDays قادمة من العميل — يعيد null إن لم يبقَ يوم صالح */
export function sanitizeWorkDays(raw: unknown): string | null {
  const days = parseWorkDays(String(raw ?? ""));
  if (days.length === 0) return null;
  // ترتيب ثابت حسب الأسبوع
  const ordered = WEEK_DAYS.map((d) => d.code).filter((c) =>
    days.includes(c),
  );
  return ordered.join(",");
}

export function workDaysLabel(raw: string | null | undefined): string {
  const days = parseWorkDays(raw);
  if (days.length === 0) return "—";
  if (days.length === 7) return "كل الأيام";
  return WEEK_DAYS.filter((d) => days.includes(d.code))
    .map((d) => d.label)
    .join("، ");
}
