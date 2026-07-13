export const appointmentStatusAr: Record<string, string> = {
  NEW_REQUEST: "طلب جديد",
  UNDER_SECRETARY_REVIEW: "قيد مراجعة السكرتارية",
  DOCTOR_ASSIGNED: "تم تعيين الطبيب",
  WAITING_DOCTOR_APPROVAL: "بانتظار موافقة الطبيب",
  CONFIRMED: "مؤكد",
  REMINDER_SENT: "تم إرسال التذكير",
  PATIENT_ARRIVED: "وصل المريض",
  WAITING_ROOM: "قاعة الانتظار",
  IN_TREATMENT: "قيد العلاج",
  COMPLETED: "مكتمل",
  FOLLOW_UP_REQUIRED: "يحتاج متابعة",
  RESCHEDULED: "تمت إعادة الجدولة",
  CANCELLED_BY_PATIENT: "ملغى من المريض",
  CANCELLED_BY_CLINIC: "ملغى من العيادة",
  NO_SHOW: "لم يحضر",
  EMERGENCY: "حالة استعجالية",
  REFERRED_TO_OTHER_DOCTOR: "محوّل لطبيب آخر",
};

export const waitingRoomStatusAr: Record<string, string> = {
  ARRIVED: "وصل إلى العيادة",
  WAITING: "ينتظر",
  WITH_DOCTOR: "دخل عند الطبيب",
  SESSION_DONE: "أنهى الحصة",
  NEEDS_FOLLOWUP: "يحتاج موعد متابعة",
  LEFT: "غادر",
};

export const toothStateAr: Record<string, string> = {
  HEALTHY: "سليم",
  DECAY: "تسوس",
  FILLED: "حشو",
  NEEDS_FILLING: "يحتاج حشو",
  ROOT_CANAL: "علاج عصب",
  CROWN: "تاج",
  MISSING: "مفقود",
  IMPLANT: "زراعة",
  EXTRACTED: "خلع",
  FRACTURED: "كسر",
  INFLAMED: "التهاب",
  UNDER_OBSERVATION: "تحت المراقبة",
};

export const treatmentPlanStatusAr: Record<string, string> = {
  NOT_STARTED: "لم تبدأ",
  IN_PROGRESS: "قيد العلاج",
  PAUSED: "متوقفة",
  COMPLETED: "مكتملة",
  CANCELLED: "ملغاة",
};

export const appointmentTypeAr: Record<string, string> = {
  GENERAL_EXAM: "فحص عام",
  EMERGENCY: "حالة استعجالية",
  TOOTHACHE: "ألم أسنان",
  CLEANING: "تنظيف",
  FILLING: "حشو",
  EXTRACTION: "نزع سن",
  ROOT_CANAL: "علاج عصب",
  ORTHO_CONSULT: "استشارة تقويم",
  ORTHO_FOLLOWUP: "متابعة تقويم",
  PROSTHETICS: "تركيب أسنان",
  SURGERY_CONSULT: "استشارة جراحية",
  SURGERY: "عملية",
  POST_OP_FOLLOWUP: "متابعة بعد العملية",
  OTHER: "أخرى",
};

export const roleAr: Record<string, string> = {
  ADMIN: "مدير النظام",
  SECRETARY: "سكرتير",
  DOCTOR_GENERAL: "طبيب عام",
  DOCTOR_SPECIALIST: "طبيب أخصائي",
  PATIENT: "مريض",
};

export const dayOfWeekAr: Record<string, string> = {
  SUNDAY: "الأحد",
  MONDAY: "الإثنين",
  TUESDAY: "الثلاثاء",
  WEDNESDAY: "الأربعاء",
  THURSDAY: "الخميس",
  FRIDAY: "الجمعة",
  SATURDAY: "السبت",
};

export const commonAr = {
  clinicName: "عيادة الوسام لطب الأسنان",
  clinicShort: "عيادة الوسام",
  clinicSubtitle: "لطب الأسنان",
  save: "حفظ",
  cancel: "إلغاء",
  confirm: "تأكيد",
  delete: "حذف",
  edit: "تعديل",
  search: "بحث",
  filter: "تصفية",
  loading: "جاري التحميل...",
  error: "حدث خطأ",
  success: "تم بنجاح",
  back: "رجوع",
  next: "التالي",
  previous: "السابق",
  actions: "إجراءات",
  details: "التفاصيل",
  print: "طباعة",
  download: "تحميل",
  upload: "رفع ملف",
  logout: "تسجيل الخروج",
  login: "تسجيل الدخول",
  noData: "لا توجد بيانات",
  required: "هذا الحقل مطلوب",
  invalidEmail: "البريد الإلكتروني غير صالح",
  invalidPhone: "رقم الهاتف غير صالح",
  welcome: "مرحبًا",
  today: "اليوم",
  yesterday: "أمس",
  all: "الكل",
  yes: "نعم",
  no: "لا",
  notes: "ملاحظات",
  status: "الحالة",
  date: "التاريخ",
  time: "الوقت",
  doctor: "الطبيب",
  patient: "المريض",
  phone: "الهاتف",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  rememberMe: "تذكرني",
  forgotPassword: "نسيت كلمة المرور؟",
  bookAppointment: "احجز موعدًا",
};

export const navSecretaryAr = [
  { href: "/secretary/dashboard", label: "الاستقبال", icon: "LayoutDashboard" },
  { href: "/secretary/today", label: "المواعيد", icon: "Calendar" },
  { href: "/secretary/directed", label: "الموجهون", icon: "Users" },
  { href: "/secretary/payments", label: "الدفع", icon: "Wallet" },
];

export const navDoctorGeneralAr = [
  { href: "/doctor/general/dashboard", label: "المعاينة", icon: "Activity" },
  { href: "/doctor/general/patients", label: "مرضاي", icon: "UserRound" },
];

export const navDoctorSpecialistAr = [
  { href: "/doctor/specialist/dashboard", label: "المعاينة", icon: "Activity" },
  { href: "/doctor/specialist/today", label: "مواعيد اليوم", icon: "Calendar" },
  { href: "/doctor/specialist/patients", label: "مرضاي", icon: "UserRound" },
  { href: "/doctor/specialist/doctors", label: "الأطباء", icon: "Stethoscope" },
  { href: "/doctor/specialist/secretaries", label: "السكرتارية", icon: "UserCog" },
  {
    href: "/doctor/specialist/settings",
    label: "الإعدادات",
    icon: "Settings",
    children: [
      {
        href: "/doctor/specialist/settings/contact",
        label: "تواصل معنا",
      },
      {
        href: "/doctor/specialist/settings/hours",
        label: "مواعيد العمل",
      },
      {
        href: "/doctor/specialist/settings/pages",
        label: "صفحات الموقع",
      },
      {
        href: "/doctor/specialist/settings/doctors",
        label: "عرض الأطباء",
      },
    ],
  },
];

export const navAdminAr = [
  { href: "/admin/dashboard", label: "لوحة التحكم", icon: "LayoutDashboard" },
  { href: "/admin/users", label: "المستخدمون", icon: "Users" },
  { href: "/admin/doctors", label: "الأطباء", icon: "Stethoscope" },
  { href: "/admin/secretaries", label: "السكرتارية", icon: "UserCog" },
  { href: "/admin/services", label: "الخدمات", icon: "ListChecks" },
  { href: "/admin/schedules", label: "الجداول", icon: "Clock" },
  { href: "/admin/settings", label: "الإعدادات", icon: "Settings" },
  { href: "/admin/reports", label: "التقارير", icon: "BarChart3" },
  { href: "/admin/audit-logs", label: "سجل النشاط", icon: "ScrollText" },
];

export const navPatientAr = [
  { href: "/patient/dashboard", label: "حسابي", icon: "LayoutDashboard" },
];
