import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { getCurrentUser } from "@/lib/auth/current-user";

type StaffUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

const DOCTOR_ROLES = new Set(["DOCTOR_GENERAL", "DOCTOR_SPECIALIST", "ADMIN"]);
const SECRETARY_ROLES = new Set(["SECRETARY", "ADMIN"]);

export function isStaffChatRole(role: string) {
  return DOCTOR_ROLES.has(role) || role === "SECRETARY";
}

export async function listPeerStaffUserIds(user: StaffUser) {
  const role = user.role.code;
  if (DOCTOR_ROLES.has(role)) {
    const secretaries = await prisma.user.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        role: { code: "SECRETARY" },
      },
      select: { id: true },
    });
    return secretaries.map((s) => s.id);
  }

  if (SECRETARY_ROLES.has(role)) {
    const doctors = await prisma.user.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        role: {
          code: { in: ["DOCTOR_GENERAL", "DOCTOR_SPECIALIST", "ADMIN"] },
        },
      },
      select: { id: true },
    });
    return doctors.map((d) => d.id);
  }

  return [];
}

export function roleLabelAr(code: string) {
  switch (code) {
    case "SECRETARY":
      return "سكرتير/ة";
    case "DOCTOR_SPECIALIST":
      return "طبيب أخصائي";
    case "DOCTOR_GENERAL":
      return "طبيب عام";
    case "ADMIN":
      return "إدارة / صاحبة العيادة";
    default:
      return code;
  }
}
