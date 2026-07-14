/** حدود اليوم بتوقيت الجزائر Africa/Algiers */
export function algiersDayBounds(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  const ymd = `${y}${m}${d}`;

  // منتصف الليل في الجزائر ≈ UTC+1 (بدون DST رسمي حالياً) — نستخدم إزاحة ثابتة آمنة عبر Date
  const startLocal = new Date(`${y}-${m}-${d}T00:00:00+01:00`);
  const endLocal = new Date(startLocal.getTime() + 24 * 60 * 60 * 1000);

  return { ymd, start: startLocal, end: endLocal };
}

/** استخراج رقم الترتيب اليومي — يعرض 1 2 3 فقط */
export function dailyQueueFromRequestNumber(requestNumber: string): string {
  const normalized = String(requestNumber || "").trim();
  // الصيغة الحالية: 20260711-3
  const dated = normalized.match(/^\d{8}-(\d+)$/);
  if (dated) return String(Number(dated[1]));
  // رقم فقط
  if (/^\d{1,4}$/.test(normalized)) return String(Number(normalized));
  // صيغ قديمة REQ-... لا تُعرض كنص — يُفضّل queueOrder من القائمة
  return "";
}
