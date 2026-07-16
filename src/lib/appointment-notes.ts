import { appointmentTypeAr } from "@/i18n/ar";

const EXAM_PREFIX = "سبب الفحص:";

/** بناء ملاحظة الموعد من النوع + سبب الفحص / أخرى */
export function buildDoctorAppointmentNotes(
  appointmentType: string,
  opts: {
    examReason?: string | null;
    customReason?: string | null;
    periodNote?: string;
  },
): string {
  const typeLabel = appointmentTypeAr[appointmentType] || appointmentType;
  const parts: string[] = [];

  if (appointmentType === "GENERAL_EXAM") {
    const exam = opts.examReason?.trim();
    parts.push(exam ? `${typeLabel} — ${EXAM_PREFIX} ${exam}` : typeLabel);
  } else if (appointmentType === "OTHER") {
    const custom = opts.customReason?.trim();
    parts.push(custom || typeLabel);
  } else {
    parts.push(typeLabel);
  }

  if (opts.periodNote?.trim()) {
    parts.push(opts.periodNote.trim());
  }

  return parts.join(" — ");
}

export function parseExamReasonFromNotes(
  notes: string | null | undefined,
): string {
  if (!notes) return "";
  const idx = notes.indexOf(EXAM_PREFIX);
  if (idx === -1) return "";
  let rest = notes.slice(idx + EXAM_PREFIX.length).trim();
  const cut = rest.indexOf(" — ");
  if (cut !== -1) rest = rest.slice(0, cut).trim();
  return rest;
}

/** التحقق من سبب الفحص أو «أخرى» قبل الحفظ */
export function validateDoctorAppointmentReason(
  appointmentType: string,
  examReason?: string | null,
  customReason?: string | null,
): string | null {
  if (appointmentType === "GENERAL_EXAM") {
    if (!examReason?.trim() || examReason.trim().length < 2) {
      return "اكتب سبب الفحص (حرفان على الأقل)";
    }
  }
  if (appointmentType === "OTHER") {
    if (!customReason?.trim() || customReason.trim().length < 2) {
      return "اكتب سبب الموعد عند اختيار «أخرى»";
    }
  }
  return null;
}

/** عرض السبب للسكرتارية — يدمج النوع مع سبب الفحص إن وُجد */
export function formatAppointmentReasonLabel(
  appointmentType: string,
  notes?: string | null,
): string {
  const base = appointmentTypeAr[appointmentType] || appointmentType;
  if (appointmentType === "GENERAL_EXAM") {
    const exam = parseExamReasonFromNotes(notes);
    return exam ? `${base} — ${exam}` : base;
  }
  if (appointmentType === "OTHER" && notes?.trim()) {
    const trimmed = notes.trim();
    const periodIdx = trimmed.indexOf(" — موعد ");
    return periodIdx > 0 ? trimmed.slice(0, periodIdx).trim() : trimmed;
  }
  return base;
}
