import { prisma } from "@/lib/db/prisma";
import {
  appointmentStatusAr,
  waitingRoomStatusAr,
} from "@/i18n/ar";
import { formatClinicAppointmentDay, formatClinicDate } from "@/lib/clinic-date";
import { generateQrAccessToken, patientQrLoginUrl } from "@/lib/patient-qr";
import type { PatientRowData } from "@/components/doctor/DoctorPatientCard";

const PAYMENT_METHOD_AR: Record<string, string> = {
  CASH: "نقداً",
  CARD: "بطاقة",
  BANK_TRANSFER: "تحويل",
  OTHER: "أخرى",
};

/** مرضى عاينهم هذا الطبيب منذ فتح حسابه فقط */
export async function loadDoctorPatients(
  doctorId: string,
  since: Date,
): Promise<PatientRowData[]> {
  const patients = await prisma.patient.findMany({
    where: {
      deletedAt: null,
      OR: [
        {
          waitingRoomEntries: {
            some: {
              doctorId,
              startedAt: { gte: since },
              status: { in: ["WITH_DOCTOR", "SESSION_DONE", "LEFT"] },
            },
          },
        },
        {
          appointments: {
            some: {
              doctorId,
              deletedAt: null,
              OR: [
                { status: { in: ["IN_TREATMENT", "COMPLETED", "FOLLOW_UP_REQUIRED"] } },
                {
                  statusHistory: {
                    some: {
                      newStatus: { in: ["IN_TREATMENT", "COMPLETED"] },
                      createdAt: { gte: since },
                    },
                  },
                },
              ],
              createdAt: { gte: since },
            },
          },
        },
      ],
    },
    include: {
      appointments: {
        where: { doctorId, deletedAt: null },
        orderBy: { startAt: "desc" },
        take: 8,
      },
      waitingRoomEntries: {
        where: { doctorId },
        orderBy: { arrivedAt: "desc" },
        take: 1,
      },
      invoices: {
        where: {
          OR: [{ doctorId }, { doctorId: null }],
          status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
          createdAt: { gte: since },
        },
        include: {
          payments: {
            where: { status: "COMPLETED" },
            orderBy: { paymentDate: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      account: { include: { user: true } },
      _count: {
        select: {
          appointments: {
            where: {
              doctorId,
              status: "COMPLETED",
              createdAt: { gte: since },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  // ضمان وجود رمز QR لكل حساب نشط
  const missingQr = patients.filter(
    (p) => p.account?.status === "ACTIVE" && !p.account.qrAccessToken,
  );
  for (const p of missingQr) {
    if (!p.account) continue;
    const token = generateQrAccessToken();
    await prisma.patientAccount.update({
      where: { id: p.account.id },
      data: { qrAccessToken: token },
    });
    p.account.qrAccessToken = token;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return patients.map((p) => {
    const waiting = p.waitingRoomEntries[0];
    const latest = p.appointments[0];
    const next = p.appointments
      .filter((a) => {
        const day = new Date(a.startAt);
        day.setHours(0, 0, 0, 0);
        return (
          day >= todayStart &&
          ["CONFIRMED", "REMINDER_SENT", "DOCTOR_ASSIGNED", "WAITING_ROOM"].includes(
            a.status,
          )
        );
      })
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0];

    let statusLabel = "تمت المعاينة";
    let statusTone: PatientRowData["statusTone"] = "success";

    if (waiting && !["LEFT"].includes(waiting.status)) {
      statusLabel = waitingRoomStatusAr[waiting.status] || waiting.status;
      statusTone =
        waiting.status === "WITH_DOCTOR"
          ? "teal"
          : waiting.status === "SESSION_DONE"
            ? "warning"
            : "success";
    } else if (latest) {
      statusLabel = appointmentStatusAr[latest.status] || latest.status;
      statusTone =
        latest.status === "COMPLETED"
          ? "success"
          : latest.status === "IN_TREATMENT"
            ? "teal"
            : "warning";
    }

    const totalBilled = p.invoices.reduce(
      (s, inv) => s + Number(inv.totalAmount),
      0,
    );
    const totalPaid = p.invoices.reduce(
      (s, inv) => s + Number(inv.paidAmount),
      0,
    );
    const remaining = p.invoices.reduce(
      (s, inv) => s + Number(inv.remainingAmount),
      0,
    );

    const paymentRows = p.invoices
      .flatMap((inv) =>
        inv.payments.map((pay) => ({
          id: pay.id,
          amount: Number(pay.amount),
          dateLabel: formatClinicDate(pay.paymentDate),
          method: PAYMENT_METHOD_AR[pay.method] || pay.method,
          receiptNumber: pay.receiptNumber,
          invoiceNumber: inv.invoiceNumber,
          _ts: pay.paymentDate.getTime(),
        })),
      )
      .sort((a, b) => b._ts - a._ts)
      .map(({ _ts: _, ...row }) => row);

    let paidLabel = "لا فاتورة";
    let paidTone: PatientRowData["paidTone"] = "muted";
    if (remaining > 0.009) {
      paidLabel = "متبقي";
      paidTone = "danger";
    } else if (totalPaid > 0) {
      paidLabel = "مدفوع";
      paidTone = "success";
    } else if (totalBilled > 0) {
      paidLabel = "لم يدفع";
      paidTone = "danger";
    }

    const accountLogin =
      p.account?.user.phone || p.account?.user.email || p.phone || "";
    const qrToken = p.account?.qrAccessToken || null;

    return {
      id: p.id,
      fullName: p.fullName,
      phone: p.phone,
      email: p.email,
      age: p.age,
      city: p.city,
      allergies: p.allergies,
      patientType: p.patientType,
      hasAccount: p.account?.status === "ACTIVE",
      accountLogin: p.account?.status === "ACTIVE" ? accountLogin : null,
      qrUrl:
        p.account?.status === "ACTIVE" && qrToken
          ? patientQrLoginUrl(qrToken, appOrigin)
          : null,
      statusLabel,
      statusTone,
      paidLabel,
      paidTone,
      sessionsCount: p._count.appointments,
      nextLabel: next ? formatClinicAppointmentDay(next.startAt) : null,
      nextAppointmentId: next?.id || null,
      nextAtIso: next?.startAt.toISOString() || null,
      lastNote: latest?.notes || null,
      finance: {
        totalBilled,
        totalPaid,
        remaining,
        payments: paymentRows,
      },
    };
  });
}
