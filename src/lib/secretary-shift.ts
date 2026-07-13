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
    end: "14:30",
    loginUntil: "14:30",
  },
  EVENING: {
    label: "مسائي",
    start: "16:00",
    end: "22:00",
    loginUntil: "22:00",
  },
} as const;
