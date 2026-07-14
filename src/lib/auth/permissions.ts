import { RoleCode } from "@prisma/client";

export const PERMISSIONS = {
  MANAGE_USERS: "manage_users",
  MANAGE_DOCTORS: "manage_doctors",
  MANAGE_SECRETARIES: "manage_secretaries",
  MANAGE_ROLES: "manage_roles",
  MANAGE_SERVICES: "manage_services",
  MANAGE_SCHEDULES: "manage_schedules",
  MANAGE_SETTINGS: "manage_settings",
  VIEW_AUDIT_LOGS: "view_audit_logs",
  VIEW_ALL_REPORTS: "view_all_reports",
  MANAGE_APPOINTMENTS: "manage_appointments",
  MANAGE_WAITING_ROOM: "manage_waiting_room",
  MANAGE_PATIENTS: "manage_patients",
  RECORD_PAYMENTS: "record_payments",
  VIEW_PAYMENTS: "view_payments",
  EDIT_DIAGNOSIS: "edit_diagnosis",
  EDIT_PRESCRIPTION: "edit_prescription",
  EDIT_SURGERY: "edit_surgery",
  EDIT_ORTHODONTICS: "edit_orthodontics",
  EDIT_DENTAL_CHART: "edit_dental_chart",
  APPROVE_PATIENT_ACCOUNT: "approve_patient_account",
  VIEW_OWN_MEDICAL: "view_own_medical",
  REQUEST_APPOINTMENT_CHANGE: "request_appointment_change",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<RoleCode, PermissionCode[]> = {
  ADMIN: Object.values(PERMISSIONS),
  SECRETARY: [
    PERMISSIONS.MANAGE_APPOINTMENTS,
    PERMISSIONS.MANAGE_WAITING_ROOM,
    PERMISSIONS.MANAGE_PATIENTS,
    PERMISSIONS.RECORD_PAYMENTS,
    PERMISSIONS.VIEW_PAYMENTS,
  ],
  DOCTOR_GENERAL: [
    PERMISSIONS.MANAGE_PATIENTS,
    PERMISSIONS.EDIT_DIAGNOSIS,
    PERMISSIONS.EDIT_PRESCRIPTION,
    PERMISSIONS.EDIT_DENTAL_CHART,
    PERMISSIONS.APPROVE_PATIENT_ACCOUNT,
    PERMISSIONS.VIEW_PAYMENTS,
  ],
  DOCTOR_SPECIALIST: [
    PERMISSIONS.MANAGE_PATIENTS,
    PERMISSIONS.EDIT_DIAGNOSIS,
    PERMISSIONS.EDIT_PRESCRIPTION,
    PERMISSIONS.EDIT_SURGERY,
    PERMISSIONS.EDIT_ORTHODONTICS,
    PERMISSIONS.EDIT_DENTAL_CHART,
    PERMISSIONS.APPROVE_PATIENT_ACCOUNT,
    PERMISSIONS.VIEW_PAYMENTS,
  ],
  PATIENT: [
    PERMISSIONS.VIEW_OWN_MEDICAL,
    PERMISSIONS.REQUEST_APPOINTMENT_CHANGE,
  ],
};

export function roleHasPermission(role: RoleCode, permission: PermissionCode) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function permissionsForRole(role: RoleCode) {
  return ROLE_PERMISSIONS[role] ?? [];
}
