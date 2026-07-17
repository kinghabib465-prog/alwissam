import type { getCurrentUser } from "@/lib/auth/current-user";
import { isClinicOwner } from "@/lib/auth/clinic-owner";

/** أنواع الموعد لصاحبة العيادة (تقويم · عمليات · فحص · أخرى) */
export const OWNER_APPOINTMENT_TYPES = [
  { value: "ORTHO_FOLLOWUP", label: "متابعة تقويم" },
  { value: "GENERAL_EXAM", label: "فحص" },
  { value: "POST_OP_FOLLOWUP", label: "بعد عملية" },
  { value: "OTHER", label: "أخرى" },
] as const;

/** الأطباء الآخرون — فحص أو سبب مخصّص فقط (لا تقويم ولا عمليات) */
export const STAFF_DOCTOR_APPOINTMENT_TYPES = [
  { value: "GENERAL_EXAM", label: "فحص" },
  { value: "OTHER", label: "أخرى" },
] as const;

const OWNER_VALUES = new Set<string>(
  OWNER_APPOINTMENT_TYPES.map((t) => t.value),
);
const STAFF_VALUES = new Set<string>(
  STAFF_DOCTOR_APPOINTMENT_TYPES.map((t) => t.value),
);

export function appointmentTypesForDoctor(
  owner: boolean,
): readonly { value: string; label: string }[] {
  return owner ? OWNER_APPOINTMENT_TYPES : STAFF_DOCTOR_APPOINTMENT_TYPES;
}

export function defaultAppointmentTypeForDoctor(owner: boolean): string {
  return owner ? "ORTHO_FOLLOWUP" : "GENERAL_EXAM";
}

export function isAppointmentTypeAllowedForDoctor(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  appointmentType: string,
): boolean {
  const allowed = isClinicOwner(user) ? OWNER_VALUES : STAFF_VALUES;
  return allowed.has(appointmentType);
}

export function appointmentTypeRestrictionError(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  appointmentType: string,
): string | null {
  if (isAppointmentTypeAllowedForDoctor(user, appointmentType)) return null;
  return "الأطباء الآخرون يحجزون «فحص» أو «أخرى» فقط — التقويم والعمليات لصاحبة العيادة";
}
