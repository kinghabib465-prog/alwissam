import { prisma } from "@/lib/db/prisma";
import type { DayOfWeek } from "@prisma/client";

export type SecretaryDoctorOpt = {
  id: string;
  name: string;
  type: string;
};

function nameKey(fullName: string) {
  return fullName
    .replace(/الدكتور|د\.|دكتور/gi, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function isMananaName(fullName: string) {
  return /منانة/.test(fullName);
}

/** طبيب منانة الرسمي (حساب الإدارة النشط) */
export async function findCanonicalMananaDoctor() {
  const email = (process.env.SEED_DOCTOR_SPECIALIST_EMAIL || "")
    .trim()
    .toLowerCase();

  if (email) {
    const byEmail = await prisma.doctor.findFirst({
      where: {
        isActive: true,
        user: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
      },
      include: { user: { include: { role: true } } },
    });
    if (byEmail) return byEmail;
  }

  return prisma.doctor.findFirst({
    where: {
      isActive: true,
      type: "SPECIALIST",
      user: {
        deletedAt: null,
        OR: [
          { role: { code: "ADMIN" } },
          { fullName: { contains: "منانة" } },
        ],
      },
    },
    include: { user: { include: { role: true } } },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * نقل كل علاقات طبيب مكرّر إلى الطبيب الرسمي
 * (مواعيد · انتظار · فواتير · …)
 */
export async function migrateDoctorRelations(
  fromDoctorId: string,
  toDoctorId: string,
) {
  if (!fromDoctorId || !toDoctorId || fromDoctorId === toDoctorId) {
    return { moved: 0 };
  }

  const ops = await prisma.$transaction([
    prisma.appointment.updateMany({
      where: { doctorId: fromDoctorId },
      data: { doctorId: toDoctorId },
    }),
    prisma.waitingRoomEntry.updateMany({
      where: { doctorId: fromDoctorId },
      data: { doctorId: toDoctorId },
    }),
    prisma.invoice.updateMany({
      where: { doctorId: fromDoctorId },
      data: { doctorId: toDoctorId },
    }),
    prisma.orthodonticCase.updateMany({
      where: { doctorId: fromDoctorId },
      data: { doctorId: toDoctorId },
    }),
    prisma.surgeryCase.updateMany({
      where: { doctorId: fromDoctorId },
      data: { doctorId: toDoctorId },
    }),
    prisma.treatmentPlan.updateMany({
      where: { doctorId: fromDoctorId },
      data: { doctorId: toDoctorId },
    }),
    prisma.treatmentSession.updateMany({
      where: { doctorId: fromDoctorId },
      data: { doctorId: toDoctorId },
    }),
    prisma.diagnosis.updateMany({
      where: { doctorId: fromDoctorId },
      data: { doctorId: toDoctorId },
    }),
    prisma.prescription.updateMany({
      where: { doctorId: fromDoctorId },
      data: { doctorId: toDoctorId },
    }),
    prisma.prostheticCase.updateMany({
      where: { doctorId: fromDoctorId },
      data: { doctorId: toDoctorId },
    }),
    prisma.operation.updateMany({
      where: { doctorId: fromDoctorId },
      data: { doctorId: toDoctorId },
    }),
  ]);

  const moved = ops.reduce((sum, r) => sum + (r.count || 0), 0);
  return { moved };
}

/** إصلاح تكرارات منانة + نقل المواعيد للحساب الرسمي */
export async function repairMananaDoctorDuplicates() {
  const canon = await findCanonicalMananaDoctor();
  if (!canon) return { canonId: null, migrated: 0, deactivated: 0 };

  const dupes = await prisma.doctor.findMany({
    where: {
      id: { not: canon.id },
      user: {
        OR: [
          { fullName: { contains: "منانة" } },
          { email: { contains: "manana", mode: "insensitive" } },
        ],
      },
    },
    include: { user: true },
  });

  let migrated = 0;
  let deactivated = 0;
  for (const dup of dupes) {
    const { moved } = await migrateDoctorRelations(dup.id, canon.id);
    migrated += moved;
    if (dup.isActive || !dup.user.deletedAt) {
      await prisma.doctor.update({
        where: { id: dup.id },
        data: { isActive: false },
      });
      if (!dup.user.deletedAt) {
        await prisma.user.update({
          where: { id: dup.userId },
          data: { status: "INACTIVE", deletedAt: new Date() },
        });
      }
      deactivated += 1;
    }
  }

  return { canonId: canon.id, migrated, deactivated };
}

type DoctorRow = {
  id: string;
  type: string;
  isActive: boolean;
  user: {
    fullName: string;
    email?: string | null;
    role?: { code: string } | null;
  };
  workingHours?: { id: string }[];
};

/**
 * قائمة أطباء للتوجيه — لا تخفي منانة؛ لا تُسقط طبيب له مواعيد اليوم.
 * عند تكرار الاسم نفضّل الحساب الرسمي.
 */
export function buildSecretaryDoctorOptions(
  doctors: DoctorRow[],
  preferIds: string[] = [],
): SecretaryDoctorOpt[] {
  const prefer = new Set(preferIds.filter(Boolean));
  const scored = doctors
    .filter((d) => d.isActive || prefer.has(d.id))
    .map((d) => {
      const name = d.user.fullName;
      const email = (d.user.email || "").toLowerCase();
      const role = d.user.role?.code || "";
      let score = 0;
      if (d.isActive) score += 10;
      if (role === "ADMIN") score += 8;
      if (email.includes("manana") || isMananaName(name)) score += 6;
      if ((d.workingHours?.length || 0) > 0) score += 3;
      if (prefer.has(d.id)) score += 5;
      if (d.type === "SPECIALIST") score += 1;
      return { d, score, key: nameKey(name) };
    })
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const out: SecretaryDoctorOpt[] = [];
  for (const row of scored) {
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    out.push({
      id: row.d.id,
      name: row.d.user.fullName,
      type: row.d.type,
    });
  }

  // أضف أي id مفضّل سقط بالاسم دون تمثيل
  for (const id of prefer) {
    if (out.some((o) => o.id === id)) continue;
    const d = doctors.find((x) => x.id === id);
    if (d) {
      out.push({ id: d.id, name: d.user.fullName, type: d.type });
    }
  }

  return out;
}

/** أي طبيب غير نشط يطابق منانة → id الرسمي */
export function coalesceDoctorIdForDisplay(
  doctorId: string,
  doctorName: string,
  canonMananaId: string | null,
  doctorIsActive: boolean,
) {
  if (!canonMananaId) return doctorId;
  if (doctorId === canonMananaId) return doctorId;
  if (!doctorIsActive && isMananaName(doctorName)) return canonMananaId;
  return doctorId;
}

export async function loadSecretaryDoctorsForDay(today: DayOfWeek) {
  return prisma.doctor.findMany({
    where: {
      OR: [
        { isActive: true, user: { deletedAt: null } },
        // أطباء غير نشطين قد يكونون ما يزالون مربوطين بمواعيد اليوم
        { isActive: false },
      ],
    },
    include: {
      user: { include: { role: true } },
      workingHours: {
        where: { isActive: true, dayOfWeek: today },
      },
    },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
}
