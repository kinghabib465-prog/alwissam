/** فترات العمل الافتراضية للعيادة — صباحي ومسائي */
export const CLINIC_SHIFT_HOURS = {
  MORNING: {
    label: "صباحي",
    start: "07:00",
    end: "14:00",
  },
  EVENING: {
    label: "مسائي",
    start: "16:00",
    end: "22:00",
  },
} as const;

export type ClinicShiftCode = keyof typeof CLINIC_SHIFT_HOURS;

function parseHm(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/** الساعة والدقيقة الحالية بتوقيت الجزائر */
export function algiersMinutesNow(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Algiers",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = Number(parts.find((p) => p.type === "minute")?.value);
  return (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0);
}

/**
 * الفترة الحالية للعيادة حسب الساعة:
 * صباح 07:00–14:00 · مساء 16:00–22:00 · غير ذلك null (استراحة / خارج الدوام)
 */
export function currentClinicShift(now = new Date()): ClinicShiftCode | null {
  const mins = algiersMinutesNow(now);
  const mStart = parseHm(CLINIC_SHIFT_HOURS.MORNING.start);
  const mEnd = parseHm(CLINIC_SHIFT_HOURS.MORNING.end);
  const eStart = parseHm(CLINIC_SHIFT_HOURS.EVENING.start);
  const eEnd = parseHm(CLINIC_SHIFT_HOURS.EVENING.end);
  if (mins >= mStart && mins < mEnd) return "MORNING";
  if (mins >= eStart && mins < eEnd) return "EVENING";
  return null;
}
