/**
 * حالات تتبّع يوم العيادة — مسار واحد منطقي:
 * مواعيد اليوم / مدخل → توجيه (WAITING) → معاينة (WITH_DOCTOR)
 * → بعد الجلسة: دفع (SESSION_DONE+فاتورة) أو إغلاق (LEFT / مغطى)
 */

/** داخل العيادة الآن — يمنع إدخال مزدوج */
export const IN_CLINIC_BUSY_STATUSES = [
  "ARRIVED",
  "WAITING",
  "WITH_DOCTOR",
] as const;

/** يظهر في قائمة معاينة الطبيب اليوم */
export const DOCTOR_EXAM_STATUSES = [
  "ARRIVED",
  "WAITING",
  "WITH_DOCTOR",
] as const;

/** بانتظار إنهاء الزيارة عند السكرتارية (دفع أو إغلاق) */
export const POST_EXAM_STATUSES = ["SESSION_DONE"] as const;

export type InClinicBusyStatus = (typeof IN_CLINIC_BUSY_STATUSES)[number];
