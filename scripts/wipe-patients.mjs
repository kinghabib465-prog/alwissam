/**
 * مسح كل المرضى والبيانات — يُبقي حسابات الطاقم.
 *
 *   CONFIRM_WIPE_PATIENTS=YES node scripts/wipe-patients.mjs
 *
 * Contabo:
 *   docker exec -e CONFIRM_WIPE_PATIENTS=YES -e DATABASE_URL="$DATABASE_URL" alwisam-app node scripts/wipe-patients.mjs
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  if (process.env.CONFIRM_WIPE_PATIENTS !== "YES") {
    throw new Error(
      "ارفض التشغيل بدون تأكيد. استخدم: CONFIRM_WIPE_PATIENTS=YES node scripts/wipe-patients.mjs",
    );
  }

  // تشغيل عبر tsx إن وُجد، وإلا عبر مسار مبني — في Docker نستخدم النسخة JS من الخدمة عبر dynamic import بعد build
  // أبسط مسار إنتاجي: استدعاء SQL عبر نفس عميل ensure-staff
  const { PrismaClient, RoleCode } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const pg = await import("pg");
  const { Pool } = pg.default || pg;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
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
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  console.log("[wipe-patients] بدء المسح...");

  try {
    const patientRole = await prisma.role.findUnique({
      where: { code: RoleCode.PATIENT },
    });

    const counts = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('alwisam-wipe-patients'))`;
        const out = {};
        const del = async (label, fn) => {
          const r = await fn();
          out[label] = r.count ?? 0;
        };

        await del("payments", () => tx.payment.deleteMany({}));
        await del("installments", () => tx.installment.deleteMany({}));
        await del("invoices", () => tx.invoice.deleteMany({}));
        await del("prescriptionItems", () => tx.prescriptionItem.deleteMany({}));
        await del("prescriptions", () => tx.prescription.deleteMany({}));
        await del("medicalDocuments", () => tx.medicalDocument.deleteMany({}));
        await del("patientConsents", () => tx.patientConsent.deleteMany({}));
        await del("fileAttachments", () => tx.fileAttachment.deleteMany({}));
        await del("orthodonticSessions", () =>
          tx.orthodonticSession.deleteMany({}),
        );
        await del("orthodonticCases", () => tx.orthodonticCase.deleteMany({}));
        await del("postOpFollowUps", () =>
          tx.postOperationFollowUp.deleteMany({}),
        );
        await del("operations", () => tx.operation.deleteMany({}));
        await del("surgeryCases", () => tx.surgeryCase.deleteMany({}));
        await del("prostheticCases", () => tx.prostheticCase.deleteMany({}));
        await del("treatmentSessions", () =>
          tx.treatmentSession.deleteMany({}),
        );
        await del("treatmentPlanStages", () =>
          tx.treatmentPlanStage.deleteMany({}),
        );
        await del("treatmentPlans", () => tx.treatmentPlan.deleteMany({}));
        await del("diagnoses", () => tx.diagnosis.deleteMany({}));
        await del("dentalToothStates", () =>
          tx.dentalToothState.deleteMany({}),
        );
        await del("dentalCharts", () => tx.dentalChart.deleteMany({}));
        await del("medicalRecords", () => tx.medicalRecord.deleteMany({}));
        await del("medicalHistories", () => tx.medicalHistory.deleteMany({}));
        await del("waitingRoomEntries", () =>
          tx.waitingRoomEntry.deleteMany({}),
        );
        await del("appointmentStatusHistory", () =>
          tx.appointmentStatusHistory.deleteMany({}),
        );
        await del("appointmentRequests", () =>
          tx.appointmentRequest.deleteMany({}),
        );
        await del("appointments", () => tx.appointment.deleteMany({}));
        await del("referrals", () => tx.referral.deleteMany({}));
        await del("messages", () => tx.message.deleteMany({}));
        await del("notifications", () => tx.notification.deleteMany({}));
        await del("patientAccounts", () => tx.patientAccount.deleteMany({}));
        await del("patients", () => tx.patient.deleteMany({}));

        let patientUsers = 0;
        if (patientRole) {
          const users = await tx.user.findMany({
            where: { roleId: patientRole.id },
            select: { id: true },
          });
          const ids = users.map((u) => u.id);
          if (ids.length) {
            await tx.session.deleteMany({ where: { userId: { in: ids } } });
            await tx.loginHistory.deleteMany({
              where: { userId: { in: ids } },
            });
            await tx.passwordResetToken.deleteMany({
              where: { userId: { in: ids } },
            });
            await tx.activationToken.deleteMany({
              where: { userId: { in: ids } },
            });
            await tx.emailChangeToken.deleteMany({
              where: { userId: { in: ids } },
            });
            await tx.userPermission.deleteMany({
              where: { userId: { in: ids } },
            });
            const deletedUsers = await tx.user.deleteMany({
              where: { id: { in: ids } },
            });
            patientUsers = deletedUsers.count;
          }
        }
        out.patientUsers = patientUsers;

        await tx.auditLog.create({
          data: {
            action: "WIPE_ALL_PATIENT_DATA",
            entityType: "Clinic",
            entityId: "all-patients",
            reason: "مسح كل المرضى والبيانات — الإبقاء على حسابات الطاقم",
            newValue: out,
          },
        });

        return out;
      },
      { timeout: 120_000 },
    );

    console.log("[wipe-patients] تم:", counts);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

function isMainModule() {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
    return thisFile === entry || import.meta.url === pathToFileURL(entry).href;
  } catch {
    return String(process.argv[1] || "").includes("wipe-patients");
  }
}

if (isMainModule()) {
  main().catch((err) => {
    console.error("[wipe-patients] FAILED:", err);
    process.exit(1);
  });
}
