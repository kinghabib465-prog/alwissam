/**
 * Production-safe staff bootstrap (no tsx / Prisma seed CLI required).
 * Safe to run on every Render free-tier start.
 */
import { PrismaClient, RoleCode, DoctorType, DayOfWeek } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

/** هاتف فريد: إن كان لغير هذا المستخدم نتجنب التعارض */
async function resolveUniquePhone(prisma, email, desiredPhone) {
  if (!desiredPhone) return null;
  const owner = await prisma.user.findUnique({
    where: { phone: desiredPhone },
    select: { id: true, email: true },
  });
  if (!owner) return desiredPhone;
  if (owner.email === email) return desiredPhone;
  console.warn(
    `[ensure-staff] phone ${desiredPhone} already used by ${owner.email}; keeping existing phone for ${email}`,
  );
  return undefined; // لا تفرض تغييراً على التحديث
}

async function upsertStaffUser(prisma, {
  email,
  phone,
  fullName,
  passwordHash,
  roleId,
}) {
  const safePhone = await resolveUniquePhone(prisma, email, phone);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return prisma.user.update({
      where: { email },
      data: {
        fullName,
        ...(safePhone !== undefined ? { phone: safePhone } : {}),
        passwordHash,
        roleId,
        status: "ACTIVE",
        deletedAt: null,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
  }

  // إنشاء: إن كان الهاتف محجوزاً استخدم هاتفاً فريداً مؤقتاً
  let createPhone = safePhone;
  if (createPhone === undefined) {
    createPhone = `seed-${email.split("@")[0]}-${Date.now().toString().slice(-6)}`;
  }

  try {
    return await prisma.user.create({
      data: {
        email,
        phone: createPhone,
        fullName,
        passwordHash,
        roleId,
        status: "ACTIVE",
      },
    });
  } catch (err) {
    // إعادة محاولة بدون هاتف مخصص إن فشل unique
    if (err?.code === "P2002") {
      return prisma.user.create({
        data: {
          email,
          phone: `seed-${Date.now().toString().slice(-8)}`,
          fullName,
          passwordHash,
          roleId,
          status: "ACTIVE",
        },
      });
    }
    throw err;
  }
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
    const secretaryUser = await upsertStaffUser(prisma, {
      email: env("SEED_SECRETARY1_EMAIL"),
      phone: env("SEED_SECRETARY1_PHONE"),
      fullName: "سمار بدر الدين",
      passwordHash: secretaryPassword,
      roleId: roles.SECRETARY.id,
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
    const specialistUser = await upsertStaffUser(prisma, {
      email: env("SEED_DOCTOR_SPECIALIST_EMAIL"),
      phone: env("SEED_DOCTOR_SPECIALIST_PHONE"),
      fullName: "الدكتور منانة فؤاد",
      passwordHash: ownerPassword,
      roleId: roles.ADMIN.id,
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

    // إزالة تكرار «منانة» — الإبقاء على الحساب الرسمي فقط
    const canonEmail = env("SEED_DOCTOR_SPECIALIST_EMAIL").toLowerCase();
    const canonPhone = env("SEED_DOCTOR_SPECIALIST_PHONE");
    const mananaDupes = await prisma.doctor.findMany({
      where: {
        userId: { not: specialistUser.id },
        user: { deletedAt: null },
        OR: [
          { user: { fullName: { contains: "منانة" } } },
          { user: { email: { contains: "manana", mode: "insensitive" } } },
          ...(canonPhone ? [{ user: { phone: canonPhone } }] : []),
        ],
      },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
    for (const dup of mananaDupes) {
      if (dup.user.email?.toLowerCase() === canonEmail) continue;
      console.warn(
        `[ensure-staff] deactivating duplicate owner doctor ${dup.id} (${dup.user.email || dup.user.fullName})`,
      );
      await prisma.doctor.update({
        where: { id: dup.id },
        data: { isActive: false },
      });
      await prisma.user.update({
        where: { id: dup.userId },
        data: { status: "INACTIVE", deletedAt: new Date() },
      });
    }

    // حساب أدمن قديم منفصل — يُعطَّل دائماً
    const legacyAdminEmail = process.env.SEED_ADMIN_EMAIL;
    if (legacyAdminEmail) {
      const legacy = await prisma.user.findUnique({
        where: { email: legacyAdminEmail },
      });
      if (legacy && legacy.id !== specialistUser.id) {
        await prisma.user.update({
          where: { id: legacy.id },
          data: { status: "INACTIVE", deletedAt: new Date() },
        });
        await prisma.doctor.updateMany({
          where: { userId: legacy.id },
          data: { isActive: false },
        });
      }
    }

    const generalPassword = await bcrypt.hash(
      env("SEED_DOCTOR_GENERAL_PASSWORD"),
      12,
    );
    const generalUser = await upsertStaffUser(prisma, {
      email: env("SEED_DOCTOR_GENERAL_EMAIL"),
      phone: env("SEED_DOCTOR_GENERAL_PHONE"),
      fullName: "الدكتور قعري أسامة",
      passwordHash: generalPassword,
      roleId: roles.DOCTOR_GENERAL.id,
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

    const clinicMapsUrl =
      "https://www.google.com/maps/place/%D8%B9%D9%8A%D8%A7%D8%AF%D8%A9+%D8%A7%D9%84%D9%88%D8%B3%D8%A7%D9%85+%D9%84%D8%B7%D8%A8+%D8%A7%D9%84%D8%A3%D8%B3%D9%86%D8%A7%D9%86+-+Clinic+Elwissam%E2%80%AD/@33.3632259,6.8538383,17z/data=!3m1!4b1!4m6!3m5!1s0x125911b43d03697f:0xe645df5d2c7c61cd!8m2!3d33.3632259!4d6.8538383!16s%2Fg%2F11pb1cckc8?entry=ttu";

    const existingClinic = await prisma.clinicSetting.findUnique({
      where: { key: "clinic_info" },
    });
    const prevClinic =
      existingClinic &&
      existingClinic.value &&
      typeof existingClinic.value === "object"
        ? existingClinic.value
        : {};
    await prisma.clinicSetting.upsert({
      where: { key: "clinic_info" },
      update: {
        value: {
          ...prevClinic,
          nameAr: prevClinic.nameAr || "عيادة الوسام لطب الأسنان",
          phone: prevClinic.phone || process.env.CLINIC_PHONE || "0550000000",
          email:
            prevClinic.email || process.env.CLINIC_EMAIL || "contact@alwisam.dz",
          address:
            prevClinic.address || process.env.CLINIC_ADDRESS || "الجزائر",
          mapsLink: prevClinic.mapsLink || clinicMapsUrl,
          mapsEmbedUrl:
            prevClinic.mapsEmbedUrl ||
            `https://www.google.com/maps?q=33.3632259,6.8538383&z=16&output=embed`,
        },
      },
      create: {
        key: "clinic_info",
        value: {
          nameAr: "عيادة الوسام لطب الأسنان",
          phone: process.env.CLINIC_PHONE || "0550000000",
          email: process.env.CLINIC_EMAIL || "contact@alwisam.dz",
          address: process.env.CLINIC_ADDRESS || "الجزائر",
          mapsLink: clinicMapsUrl,
          mapsEmbedUrl:
            "https://www.google.com/maps?q=33.3632259,6.8538383&z=16&output=embed",
        },
      },
    });

    // خدمة تبييض الليزر (إن وُجدت الهجرة)
    try {
      await prisma.service.upsert({
        where: { code: "LASER_WHITENING" },
        update: {
          nameAr: "تبييض الأسنان بالليزر",
          category: "تجميل",
          defaultDuration: 60,
          isActive: true,
        },
        create: {
          code: "LASER_WHITENING",
          nameAr: "تبييض الأسنان بالليزر",
          category: "تجميل",
          defaultDuration: 60,
          isActive: true,
        },
      });
    } catch (err) {
      console.warn("[ensure-staff] LASER_WHITENING service skipped:", err?.message);
    }

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

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    const thisFile = fileURLToPath(import.meta.url);
    const invoked = path.resolve(entry);
    if (thisFile === invoked) return true;
    // مقارنة بـ file URL — بعض بيئات Prisma تمرّر مساراً نسبياً
    return import.meta.url === pathToFileURL(invoked).href;
  } catch {
    return String(entry).includes("ensure-staff");
  }
}

if (isMainModule()) {
  ensureStaff()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error("[ensure-staff] FAILED:", err);
      // على Render: لا تُسقط التشغيل إن فشل seed — instrumentation يعيد المحاولة
      const soft =
        process.env.SEED_SOFT_FAIL === "1" ||
        process.env.RENDER === "true" ||
        !!process.env.RENDER_SERVICE_ID;
      process.exit(soft ? 0 : 1);
    });
}
