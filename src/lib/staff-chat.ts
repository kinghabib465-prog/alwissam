import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { getCurrentUser } from "@/lib/auth/current-user";

type StaffUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export type StaffPeerGroup = "DOCTORS" | "SECRETARIES";

export type StaffPeer = {
  id: string;
  fullName: string;
  role: string;
  roleLabel: string;
  group: StaffPeerGroup;
};

const DOCTOR_SIDE = new Set(["DOCTOR_GENERAL", "DOCTOR_SPECIALIST", "ADMIN"]);

export function isStaffChatRole(role: string) {
  return DOCTOR_SIDE.has(role) || role === "SECRETARY";
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

function toPeer(
  u: { id: string; fullName: string; role: { code: string } },
  group: StaffPeerGroup,
): StaffPeer {
  return {
    id: u.id,
    fullName: u.fullName,
    role: u.role.code,
    roleLabel: roleLabelAr(u.role.code),
    group,
  };
}

/**
 * جهات التواصل في أيقونة الدردشة:
 * - الطبيب: السكرتارية + بقية الأطباء
 * - السكرتير: الأطباء (ومنهم صاحبة العيادة)
 */
export async function listStaffPeers(user: StaffUser): Promise<StaffPeer[]> {
  const role = user.role.code;
  const byId = new Map<string, StaffPeer>();

  const add = (peer: StaffPeer) => {
    if (peer.id === user.id) return;
    byId.set(peer.id, peer);
  };

  if (DOCTOR_SIDE.has(role)) {
    const [secretaries, doctors] = await Promise.all([
      prisma.user.findMany({
        where: {
          deletedAt: null,
          status: "ACTIVE",
          role: { code: "SECRETARY" },
        },
        include: { role: true },
        orderBy: { fullName: "asc" },
      }),
      prisma.user.findMany({
        where: {
          deletedAt: null,
          status: "ACTIVE",
          id: { not: user.id },
          role: {
            code: { in: ["DOCTOR_GENERAL", "DOCTOR_SPECIALIST", "ADMIN"] },
          },
        },
        include: { role: true },
        orderBy: { fullName: "asc" },
      }),
    ]);
    for (const s of secretaries) add(toPeer(s, "SECRETARIES"));
    for (const d of doctors) add(toPeer(d, "DOCTORS"));
  }

  if (role === "SECRETARY") {
    const doctors = await prisma.user.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        role: {
          code: { in: ["DOCTOR_GENERAL", "DOCTOR_SPECIALIST", "ADMIN"] },
        },
      },
      include: { role: true },
      orderBy: { fullName: "asc" },
    });
    for (const d of doctors) add(toPeer(d, "DOCTORS"));
  }

  return [...byId.values()].sort((a, b) => {
    if (a.group !== b.group) return a.group === "DOCTORS" ? -1 : 1;
    return a.fullName.localeCompare(b.fullName, "ar");
  });
}

export async function listPeerStaffUserIds(user: StaffUser) {
  const peers = await listStaffPeers(user);
  return peers.map((p) => p.id);
}
