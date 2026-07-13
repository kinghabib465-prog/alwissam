import "dotenv/config";
import {
  DayOfWeek,
  DoctorType,
  PrismaClient,
  RoleCode,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword } from "../../src/lib/auth/password";
import { PERMISSIONS } from "../../src/lib/auth/permissions";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function upsertRole(code: RoleCode, nameAr: string) {
  return prisma.role.upsert({
    where: { code },
    update: { nameAr },
    create: { code, nameAr },
  });
}

async function upsertPermission(code: string, nameAr: string, module: string) {
  return prisma.permission.upsert({
    where: { code },
    update: { nameAr, module },
    create: { code, nameAr, module },
  });
}

async function main() {
  console.log("Seeding Al Wisam Dental Clinic...");

  const roles = {
    ADMIN: await upsertRole(RoleCode.ADMIN, "مدير النظام"),
    SECRETARY: await upsertRole(RoleCode.SECRETARY, "سكرتير"),
    DOCTOR_GENERAL: await upsertRole(RoleCode.DOCTOR_GENERAL, "طبيب عام"),
    DOCTOR_SPECIALIST: await upsertRole(
      RoleCode.DOCTOR_SPECIALIST,
      "طبيب أخصائي",
    ),
    PATIENT: await upsertRole(RoleCode.PATIENT, "مريض"),
  };

  for (const [key, code] of Object.entries(PERMISSIONS)) {
    await upsertPermission(code, key, code.split("_")[0] || "general");
  }

  const allPermissions = await prisma.permission.findMany();
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roles.ADMIN.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: { roleId: roles.ADMIN.id, permissionId: permission.id },
    });
  }

  const settings: Array<{ key: string; value: object }> = [
    {
      key: "clinic_info",
      value: {
        nameAr: "عيادة الوسام لطب الأسنان",
        phone: process.env.CLINIC_PHONE || "0550000000",
        email: process.env.CLINIC_EMAIL || "contact@alwisam.dz",
        address: process.env.CLINIC_ADDRESS || "الجزائر",
      },
    },
    {
      key: "patient_activation_policy",
      value: { requiresDoctorApproval: true, secretaryCanRequest: true },
    },
    {
      key: "payment_methods",
      value: { cash: true, card: true, bankTransfer: true },
    },
  ];

  for (const setting of settings) {
    await prisma.clinicSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: { key: setting.key, value: setting.value },
    });
  }

  const services = [
    { code: "GENERAL_EXAM", nameAr: "فحص عام", category: "عام", defaultDuration: 30 },
    { code: "EMERGENCY", nameAr: "حالة استعجالية", category: "استعجالي", defaultDuration: 30 },
    { code: "TOOTHACHE", nameAr: "ألم أسنان", category: "عام", defaultDuration: 30 },
    { code: "CLEANING", nameAr: "تنظيف", category: "عام", defaultDuration: 45 },
    { code: "FILLING", nameAr: "حشو", category: "عام", defaultDuration: 45 },
    { code: "EXTRACTION", nameAr: "نزع سن", category: "عام", defaultDuration: 40 },
    { code: "ROOT_CANAL", nameAr: "علاج عصب", category: "عام", defaultDuration: 60 },
    { code: "ORTHO_CONSULT", nameAr: "استشارة تقويم", category: "تقويم", defaultDuration: 45 },
    { code: "ORTHO_FOLLOWUP", nameAr: "متابعة تقويم", category: "تقويم", defaultDuration: 30 },
    { code: "PROSTHETICS", nameAr: "تركيب أسنان", category: "تركيبات", defaultDuration: 60 },
    { code: "SURGERY_CONSULT", nameAr: "استشارة جراحية", category: "جراحة", defaultDuration: 45 },
    { code: "SURGERY", nameAr: "عملية", category: "جراحة", defaultDuration: 90 },
    { code: "POST_OP_FOLLOWUP", nameAr: "متابعة بعد العملية", category: "جراحة", defaultDuration: 30 },
    { code: "OTHER", nameAr: "أخرى", category: "عام", defaultDuration: 30 },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { code: service.code },
      update: {
        nameAr: service.nameAr,
        category: service.category,
        defaultDuration: service.defaultDuration,
        isActive: true,
      },
      create: service,
    });
  }

  // لا يوجد حساب أدمن منفصل — صاحبة العيادة (منانة) تملك صلاحيات الإدارة
  const legacyAdminEmail = process.env.SEED_ADMIN_EMAIL;
  if (legacyAdminEmail) {
    await prisma.user.updateMany({
      where: { email: legacyAdminEmail },
      data: { status: "INACTIVE", deletedAt: new Date() },
    });
  }

  const secretaryPassword = await hashPassword(
    requireEnv("SEED_SECRETARY1_PASSWORD"),
  );
  const secretaryUser = await prisma.user.upsert({
    where: { email: requireEnv("SEED_SECRETARY1_EMAIL") },
    update: {
      fullName: "سمار بدر الدين",
      phone: requireEnv("SEED_SECRETARY1_PHONE"),
      passwordHash: secretaryPassword,
      roleId: roles.SECRETARY.id,
      status: "ACTIVE",
    },
    create: {
      email: requireEnv("SEED_SECRETARY1_EMAIL"),
      phone: requireEnv("SEED_SECRETARY1_PHONE"),
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
      workStartTime: "07:00",
      workEndTime: "14:30",
    },
    create: {
      userId: secretaryUser.id,
      employeeCode: "SEC-001",
      shiftCode: "MORNING",
      workStartTime: "07:00",
      workEndTime: "14:30",
    },
  });

  // صاحب العيادة: الدكتور منانة فؤاد — صلاحيات الإدارة + طبيب أخصائي
  const ownerPassword = await hashPassword(
    requireEnv("SEED_DOCTOR_SPECIALIST_PASSWORD"),
  );
  const specialistUser = await prisma.user.upsert({
    where: { email: requireEnv("SEED_DOCTOR_SPECIALIST_EMAIL") },
    update: {
      fullName: "الدكتور منانة فؤاد",
      phone: requireEnv("SEED_DOCTOR_SPECIALIST_PHONE"),
      passwordHash: ownerPassword,
      roleId: roles.ADMIN.id,
      status: "ACTIVE",
    },
    create: {
      email: requireEnv("SEED_DOCTOR_SPECIALIST_EMAIL"),
      phone: requireEnv("SEED_DOCTOR_SPECIALIST_PHONE"),
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
      bioAr:
        "صاحبة العيادة — تقويم الأسنان والتركيبات والجراحة والحالات متعددة الحصص",
      colorCode: "#0F9A9A",
      isActive: true,
    },
    create: {
      userId: specialistUser.id,
      type: DoctorType.SPECIALIST,
      specialtyAr: "تقويم الأسنان · التركيبات · الجراحة",
      bioAr:
        "صاحبة العيادة — تقويم الأسنان والتركيبات والجراحة والحالات متعددة الحصص",
      colorCode: "#0F9A9A",
    },
  });

  const generalPassword = await hashPassword(
    requireEnv("SEED_DOCTOR_GENERAL_PASSWORD"),
  );
  const generalUser = await prisma.user.upsert({
    where: { email: requireEnv("SEED_DOCTOR_GENERAL_EMAIL") },
    update: {
      fullName: "الدكتور قعري أسامة",
      phone: requireEnv("SEED_DOCTOR_GENERAL_PHONE"),
      passwordHash: generalPassword,
      roleId: roles.DOCTOR_GENERAL.id,
      status: "ACTIVE",
    },
    create: {
      email: requireEnv("SEED_DOCTOR_GENERAL_EMAIL"),
      phone: requireEnv("SEED_DOCTOR_GENERAL_PHONE"),
      fullName: "الدكتور قعري أسامة",
      passwordHash: generalPassword,
      roleId: roles.DOCTOR_GENERAL.id,
      status: "ACTIVE",
    },
  });

  const general = await prisma.doctor.upsert({
    where: { userId: generalUser.id },
    update: {
      type: DoctorType.GENERAL,
      specialtyAr: "الحالات الاستعجالية · العلاج العام",
      bioAr: "طبيب عام للحالات الاستعجالية والعلاج الروتيني والخلع البسيط",
      colorCode: "#176B87",
      isActive: true,
    },
    create: {
      userId: generalUser.id,
      type: DoctorType.GENERAL,
      specialtyAr: "الحالات الاستعجالية · العلاج العام",
      bioAr: "طبيب عام للحالات الاستعجالية والعلاج الروتيني والخلع البسيط",
      colorCode: "#176B87",
    },
  });

  const mananaDays: DayOfWeek[] = [
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
  ];
  for (const day of mananaDays) {
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
    await prisma.workingHour.upsert({
      where: {
        doctorId_dayOfWeek_shift: {
          doctorId: specialist.id,
          dayOfWeek: day,
          shift: "EVENING",
        },
      },
      update: { startTime: "17:00", endTime: "21:00", isActive: true },
      create: {
        doctorId: specialist.id,
        dayOfWeek: day,
        shift: "EVENING",
        startTime: "17:00",
        endTime: "21:00",
      },
    });
  }

  const wakriDays: DayOfWeek[] = [
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.SATURDAY,
  ];
  for (const day of wakriDays) {
    await prisma.workingHour.upsert({
      where: {
        doctorId_dayOfWeek_shift: {
          doctorId: general.id,
          dayOfWeek: day,
          shift: "DAY",
        },
      },
      update: { startTime: "09:00", endTime: "17:00", isActive: true },
      create: {
        doctorId: general.id,
        dayOfWeek: day,
        shift: "DAY",
        startTime: "09:00",
        endTime: "17:00",
        isActive: true,
      },
    });
  }

  await prisma.workingHour.upsert({
    where: {
      doctorId_dayOfWeek_shift: {
        doctorId: general.id,
        dayOfWeek: DayOfWeek.FRIDAY,
        shift: "DAY",
      },
    },
    update: { isActive: false, startTime: "00:00", endTime: "00:00" },
    create: {
      doctorId: general.id,
      dayOfWeek: DayOfWeek.FRIDAY,
      shift: "DAY",
      startTime: "00:00",
      endTime: "00:00",
      isActive: false,
    },
  });

  const templates = [
    {
      code: "APPOINTMENT_REQUEST_RECEIVED",
      titleAr: "تم استلام طلب الموعد",
      bodyAr: "تم استلام طلب موعدك وسيتم مراجعته من قبل السكرتارية.",
    },
    {
      code: "APPOINTMENT_CONFIRMED",
      titleAr: "تم تأكيد الموعد",
      bodyAr: "تم تأكيد موعدك. يرجى الحضور في الوقت المحدد.",
    },
    {
      code: "APPOINTMENT_REMINDER_24H",
      titleAr: "تذكير بالموعد",
      bodyAr: "تذكير: لديك موعد غدًا في عيادة الوسام لطب الأسنان.",
    },
    {
      code: "ACCOUNT_ACTIVATION",
      titleAr: "تفعيل حساب المريض",
      bodyAr: "تمت الموافقة على فتح حسابك. استخدم رمز التفعيل لإنشاء كلمة المرور.",
    },
  ];

  for (const template of templates) {
    await prisma.notificationTemplate.upsert({
      where: { code: template.code },
      update: template,
      create: template,
    });
  }

  console.log("Seed completed successfully.");
  console.log("No fake patients or appointments were created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
