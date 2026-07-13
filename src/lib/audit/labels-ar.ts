/** تسميات عربية لإجراءات سجل العمل */
export const auditActionLabelsAr: Record<string, string> = {
  LOGIN_SUCCESS: "تسجيل دخول ناجح",
  LOGIN_FAILED: "محاولة دخول فاشلة",
  LOGOUT: "تسجيل خروج",
  PASSWORD_RESET_REQUESTED: "طلب إعادة كلمة المرور",
  PASSWORD_RESET_COMPLETED: "إتمام إعادة كلمة المرور",
  SECRETARY_CREATED: "إنشاء حساب سكرتير",
  SECRETARY_DELETED: "حذف حساب سكرتير",
  DOCTOR_CREATED: "إنشاء حساب طبيب",
  DOCTOR_DELETED: "حذف حساب طبيب",
  PATIENT_CREATED: "تسجيل مريض",
  PATIENT_ARRIVED: "وصول مريض",
  PATIENT_DIRECTED: "توجيه مريض لطبيب",
  WAITING_ROOM_STATUS_CHANGE: "تحديث قاعة الانتظار",
  APPOINTMENT_REQUEST_STATUS_CHANGE: "تحديث طلب موعد",
  APPOINTMENT_CONFIRMED: "تأكيد موعد",
  INVOICE_CREATED: "إنشاء فاتورة",
  PAYMENT_CREATED: "تسجيل دفعة",
  POST_VISIT_CHECKOUT: "تسوية بعد الزيارة",
  ORTHO_START_APPROVED: "الموافقة على بدء التقويم",
  ORTHO_START_REJECTED: "رفض بدء التقويم",
  PATIENT_ACCOUNT_CREATED_ACTIVE: "إنشاء حساب مريض",
  PATIENT_ACCOUNT_ACTIVATED: "تفعيل حساب مريض",
  DENTAL_CHART_UPDATE: "تحديث خريطة الأسنان",
  FILE_UPLOAD: "رفع ملف",
  EXAM_STARTED: "بدء معاينة",
  EXAM_COMPLETED_CHARGE: "إنهاء معاينة وإرسال مبلغ",
  DOCTOR_CHARGE_COLLECTED: "استلام مبلغ المعاينة",
};

export function auditActionLabel(action: string) {
  return auditActionLabelsAr[action] || action;
}
