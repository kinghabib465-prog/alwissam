import { RoleCode } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";

/**
 * مسح كل المرضى والبيانات المرتبطة — مع الإبقاء على حسابات الطاقم والإعدادات.
 * يتطلب CONFIRM_WIPE_PATIENTS=YES عند الاستدعاء من سكربت CLI فقط؛
 * واجهة الإدارة تمرّر confirmed=true بعد عبارة تأكيد.
 */
export async function wipeAllPatientData(options?: {
  confirmed?: boolean;
  actorUserId?: string;
  actorRoleCode?: string;
  actorName?: string;
}) {
  const cliOk = process.env.CONFIRM_WIPE_PATIENTS === "YES";
  if (!options?.confirmed && !cliOk) {
    throw new Error(
      "التأكيد مطلوب. للسكربت: CONFIRM_WIPE_PATIENTS=YES",
    );
  }

  const patientRole = await prisma.role.findUnique({
    where: { code: RoleCode.PATIENT },
  });

  const counts = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('alwisam-wipe-patients'))`;

      const out: Record<string, number> = {};
      const del = async (label: string, fn: () => Promise<{ count: number }>) => {
        const r = await fn();
        out[label] = r.count;
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
      await del("treatmentSessions", () => tx.treatmentSession.deleteMany({}));
      await del("treatmentPlanStages", () =>
        tx.treatmentPlanStage.deleteMany({}),
      );
      await del("treatmentPlans", () => tx.treatmentPlan.deleteMany({}));
      await del("diagnoses", () => tx.diagnosis.deleteMany({}));
      await del("dentalToothStates", () => tx.dentalToothState.deleteMany({}));
      await del("dentalCharts", () => tx.dentalChart.deleteMany({}));
      await del("medicalRecords", () => tx.medicalRecord.deleteMany({}));
      await del("medicalHistories", () => tx.medicalHistory.deleteMany({}));

      await del("waitingRoomEntries", () => tx.waitingRoomEntry.deleteMany({}));
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
          await tx.loginHistory.deleteMany({ where: { userId: { in: ids } } });
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
      return out;
    },
    { timeout: 120_000 },
  );

  await createAuditLog({
    userId: options?.actorUserId,
    roleCode: options?.actorRoleCode,
    action: "WIPE_ALL_PATIENT_DATA",
    entityType: "Clinic",
    entityId: "all-patients",
    newValue: counts,
    reason: options?.actorName
      ? `مسح كل المرضى بواسطة ${options.actorName}`
      : "مسح كل المرضى والبيانات — الإبقاء على حسابات الطاقم",
  });

  return counts;
}
