import { redirect } from "next/navigation";
import type { RoleCode } from "@prisma/client";
import { getSessionFromCookie } from "@/lib/auth/session";
import { roleDashboardPath } from "@/lib/audit/log";
import {
  type PermissionCode,
  roleHasPermission,
} from "@/lib/auth/permissions";

export async function getCurrentUser() {
  const session = await getSessionFromCookie();
  if (!session) return null;
  return {
    ...session.user,
    sessionId: session.id,
    csrfToken: session.csrfToken,
  };
}

export async function requireUser(allowedRoles?: RoleCode[]) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/staff/login");
  }
  // صاحبة العيادة (ADMIN + ملف طبيب أخصائي) تدخل مسارات الأخصائي
  if (allowedRoles && !allowedRoles.includes(user.role.code)) {
    const isClinicOwnerOnSpecialistRoute =
      user.role.code === "ADMIN" &&
      allowedRoles.includes("DOCTOR_SPECIALIST") &&
      !!user.doctor &&
      user.doctor.type === "SPECIALIST";
    if (!isClinicOwnerOnSpecialistRoute) {
      redirect(roleDashboardPath(user.role.code));
    }
  }
  return user;
}

export async function requirePermission(permission: PermissionCode) {
  const user = await requireUser();
  if (!roleHasPermission(user.role.code, permission)) {
    redirect(roleDashboardPath(user.role.code));
  }
  return user;
}

export async function requirePatientUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/patient/login");
  if (user.role.code !== "PATIENT") {
    redirect(roleDashboardPath(user.role.code));
  }
  return user;
}
