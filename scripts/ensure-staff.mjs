/**
 * Production-safe staff bootstrap (no tsx / Prisma seed CLI required).
 * Safe to run on every Render free-tier start.
 */
import { PrismaClient, RoleCode, DoctorType, DayOfWeek } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import { pathToFileURL } from "node:url";

const { Pool } = pg;

const defaults = {
  SEED_SECRETARY1_EMAIL: "samar@alwisam.dz",
  SEED_SECRETARY1_PHONE: "0550000002",
  SEED_SECRETARY1_PASSWORD: "ChangeMe_Secretary_123!",
  SEED_DOCTOR_SPECIALIST_EMAIL: "manana@alwisam.dz",
  SEED_DOCTOR_SPECIALIST_PHONE: "0550000003",
  SEED_DOCTOR_SPECIALIST_PASSWORD: "ChangeMe_Doctor_123!",
  SEED_DOCTOR_GENERAL_EMAIL: "wakri@alwisam.dz",
  SEED_DOCTOR_GENERAL_PHONE: "0550000004",
  SEED_DOCTOR_GENERAL_PASSWORD: "ChangeMe_Doctor_123!",
};

function env(name) {
  return process.env[name] || defaults[name];
}

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const isLocal = /localhost|127\.0\.0\.1|@postgres:/.test(connectionString);
  const pool = new Pool({
    connectionString,
    ssl:
      process.env.DATABASE_SSL === "false" || isLocal
        ? undefined
        : {
            rejectUnauthorized:
              process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true",
          },
  });
  return {
    prisma: new PrismaClient({ adapter: new PrismaPg(pool) }),
    pool,
  };
}

async function upsertRole(prisma, code, nameAr) {
  return prisma.role.upsert({
    where: { code },
    update: { nameAr },
    create: { code, nameAr },
  });
}

export async function ensureStaff() {
  console.log("[ensure-staff] Starting staff bootstrap...");
  const { prisma, pool } = createPrisma();

  try {
    const roles = {
      ADMIN: await upsertRole(prisma, RoleCode.ADMIN, "مدير النظام"),
      SECRETARY: await upsertRole(prisma, RoleCode.SECRETARY, "سكرتير"),
      DOCTOR_GENERAL: await upsertRole(
        prisma,
        RoleCode.DOCTOR_GENERAL,
        "طبيب عام",
      ),
      DOCTOR_SPECIALIST: await upsertRole(
        prisma,
        RoleCode.DOCTOR_SPECIALIST,
        "طبيب أخصائي",
      ),
      PATIENT: await upsertRole(prisma, RoleCode.PATIENT, "مريض"),
    };

    const secretaryPassword = await bcrypt.hash(
      env("SEED_SECRETARY1_PASSWORD"),
      12,
    );
    const secretaryUser = await prisma.user.upsert({
      where: { email: env("SEED_SECRETARY1_EMAIL") },
      update: {
        fullName: "سمار بدر الدين",
        phone: env("SEED_SECRETARY1_PHONE"),
        passwordHash: secretaryPassword,
        roleId: roles.SECRETARY.id,
        status: "ACTIVE",
        deletedAt: null,
        failedLoginCount: 0,
        lockedUntil: null,
      },
      create: {
        email: env("SEED_SECRETARY1_EMAIL"),
        phone: env("SEED_SECRETARY1_PHONE"),
        fullName: "سمار بدر الدين",
        passwordHash: secretaryPassword,
        roleId: roles.SECRETARY.id,
        status: "ACTIVE",
      },
    });

    await prisma.secretaryProfile.upsert({
      where: { userId: secretaryUser.id },
      update: {
        employeeCode: "SEC-001",
        shiftCode: "MORNING",
        workStartTime: "00:00",
        workEndTime: "23:59",
      },
      create: {
        userId: secretaryUser.id,
        employeeCode: "SEC-001",
        shiftCode: "MORNING",
        workStartTime: "00:00",
        workEndTime: "23:59",
      },
    });

    const ownerPassword = await bcrypt.hash(
      env("SEED_DOCTOR_SPECIALIST_PASSWORD"),
      12,
    );
    const specialistUser = await prisma.user.upsert({
      where: { email: env("SEED_DOCTOR_SPECIALIST_EMAIL") },
      update: {
        fullName: "الدكتور منانة فؤاد",
        phone: env("SEED_DOCTOR_SPECIALIST_PHONE"),
        passwordHash: ownerPassword,
        roleId: roles.ADMIN.id,
        status: "ACTIVE",
        deletedAt: null,
        failedLoginCount: 0,
        lockedUntil: null,
      },
      create: {
        email: env("SEED_DOCTOR_SPECIALIST_EMAIL"),
        phone: env("SEED_DOCTOR_SPECIALIST_PHONE"),
        fullName: "الدكتور منانة فؤاد",
        passwordHash: ownerPassword,
        roleId: roles.ADMIN.id,
        status: "ACTIVE",
      },
    });

    const specialist = await prisma.doctor.upsert({
      where: { userId: specialistUser.id },
      update: {
        type: DoctorType.SPECIALIST,
        specialtyAr: "تقويم الأسنان · التركيبات · الجراحة",
        isActive: true,
      },
      create: {
        userId: specialistUser.id,
        type: DoctorType.SPECIALIST,
        specialtyAr: "تقويم الأسنان · التركيبات · الجراحة",
        colorCode: "#0F9A9A",
      },
    });

    const generalPassword = await bcrypt.hash(
      env("SEED_DOCTOR_GENERAL_PASSWORD"),
      12,
    );
    const generalUser = await prisma.user.upsert({
      where: { email: env("SEED_DOCTOR_GENERAL_EMAIL") },
      update: {
        fullName: "الدكتور قعري أسامة",
        phone: env("SEED_DOCTOR_GENERAL_PHONE"),
        passwordHash: generalPassword,
        roleId: roles.DOCTOR_GENERAL.id,
        status: "ACTIVE",
        deletedAt: null,
        failedLoginCount: 0,
        lockedUntil: null,
      },
      create: {
        email: env("SEED_DOCTOR_GENERAL_EMAIL"),
        phone: env("SEED_DOCTOR_GENERAL_PHONE"),
        fullName: "الدكتور قعري أسامة",
        passwordHash: generalPassword,
        roleId: roles.DOCTOR_GENERAL.id,
        status: "ACTIVE",
      },
    });

    await prisma.doctor.upsert({
      where: { userId: generalUser.id },
      update: {
        type: DoctorType.GENERAL,
        specialtyAr: "الحالات الاستعجالية · العلاج العام",
        isActive: true,
      },
      create: {
        userId: generalUser.id,
        type: DoctorType.GENERAL,
        specialtyAr: "الحالات الاستعجالية · العلاج العام",
        colorCode: "#176B87",
      },
    });

    await prisma.clinicSetting.upsert({
      where: { key: "clinic_info" },
      update: {},
      create: {
        key: "clinic_info",
        value: {
          nameAr: "عيادة الوسام لطب الأسنان",
          phone: process.env.CLINIC_PHONE || "0550000000",
          email: process.env.CLINIC_EMAIL || "contact@alwisam.dz",
          address: process.env.CLINIC_ADDRESS || "الجزائر",
        },
      },
    });

    for (const day of [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
    ]) {
      await prisma.workingHour.upsert({
        where: {
          doctorId_dayOfWeek_shift: {
            doctorId: specialist.id,
            dayOfWeek: day,
            shift: "MORNING",
          },
        },
        update: { startTime: "08:00", endTime: "13:30", isActive: true },
        create: {
          doctorId: specialist.id,
          dayOfWeek: day,
          shift: "MORNING",
          startTime: "08:00",
          endTime: "13:30",
        },
      });
    }

    console.log("[ensure-staff] Staff accounts ready");
  } finally {
    await prisma.$disconnect().catch(() => undefined);
    await pool.end().catch(() => undefined);
  }
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  ensureStaff().catch((err) => {
    console.error("[ensure-staff] FAILED:", err);
    process.exit(1);
  });
}
