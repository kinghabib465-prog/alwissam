/** أسباب الزيارة المشتركة — التسجيل العام + استقبال السكرتارية */
export const VISIT_REASONS = [
  { value: "EMERGENCY", label: "حالة استعجالية (أورجونص)" },
  { value: "TOOTHACHE", label: "ألم أسنان" },
  { value: "GENERAL_EXAM", label: "فحص عام" },
  { value: "CLEANING", label: "تنظيف" },
  { value: "FILLING", label: "حشو" },
  { value: "EXTRACTION", label: "نزع سن" },
  { value: "ROOT_CANAL", label: "علاج عصب" },
  { value: "ORTHO_CONSULT", label: "استشارة تقويم" },
  { value: "ORTHO_FOLLOWUP", label: "متابعة تقويم" },
  { value: "PROSTHETICS", label: "تركيب أسنان" },
  { value: "SURGERY_CONSULT", label: "استشارة جراحية" },
  { value: "SURGERY", label: "عملية" },
  { value: "POST_OP_FOLLOWUP", label: "متابعة بعد العملية" },
  { value: "LASER_WHITENING", label: "تبييض الأسنان بالليزر" },
  { value: "OTHER", label: "أخرى" },
] as const;

export type VisitReasonValue = (typeof VISIT_REASONS)[number]["value"];

export function visitReasonLabel(value: string | null | undefined): string {
  if (!value) return "";
  return VISIT_REASONS.find((r) => r.value === value)?.label || value;
}
