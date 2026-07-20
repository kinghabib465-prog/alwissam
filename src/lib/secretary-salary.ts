import { prisma } from "@/lib/db/prisma";

export type SecretarySalarySetting = {
  /** يوم الشهر 1–28 (أو 0 = معطّل) */
  dayOfMonth: number;
  note: string;
};

const KEY = "secretary_salary_day";

export async function loadSecretarySalarySetting(): Promise<SecretarySalarySetting> {
  try {
    const row = await prisma.clinicSetting.findUnique({ where: { key: KEY } });
    const v = (row?.value || {}) as Partial<SecretarySalarySetting>;
    const day = Number(v.dayOfMonth);
    return {
      dayOfMonth:
        Number.isFinite(day) && day >= 1 && day <= 28 ? Math.floor(day) : 0,
      note: String(v.note || "").trim(),
    };
  } catch {
    return { dayOfMonth: 0, note: "" };
  }
}

export function isSecretarySalaryDueToday(
  setting: SecretarySalarySetting,
  now = new Date(),
): boolean {
  if (!setting.dayOfMonth) return false;
  const day = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Algiers",
      day: "numeric",
    }).format(now),
  );
  return day === setting.dayOfMonth;
}

export function algiersDayOfMonth(now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Algiers",
      day: "numeric",
    }).format(now),
  );
}
