import { prisma } from "@/lib/db/prisma";
import type { RoleCode } from "@prisma/client";

export type AuditInput = {
  userId?: string | null;
  roleCode?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  ipAddress?: string | null;
  deviceInfo?: string | null;
};

export async function createAuditLog(input: AuditInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId || undefined,
      roleCode: input.roleCode || undefined,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || undefined,
      oldValue: input.oldValue ? (input.oldValue as object) : undefined,
      newValue: input.newValue ? (input.newValue as object) : undefined,
      reason: input.reason || undefined,
      ipAddress: input.ipAddress || undefined,
      deviceInfo: input.deviceInfo || undefined,
    },
  });
}

export function roleDashboardPath(
  role: RoleCode,
  options?: { doctorType?: "GENERAL" | "SPECIALIST" | null },
): string {
  switch (role) {
    case "ADMIN":
      // صاحبة العيادة (منانة) — لوحة الأخصائي
      return "/doctor/specialist/dashboard";
    case "SECRETARY":
      return "/secretary/dashboard";
    case "DOCTOR_GENERAL":
      return "/doctor/general/dashboard";
    case "DOCTOR_SPECIALIST":
      return "/doctor/specialist/dashboard";
    case "PATIENT":
      return "/patient/dashboard";
    default:
      return "/";
  }
}

