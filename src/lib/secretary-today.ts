import { prisma } from "@/lib/db/prisma";
import { algiersDayBounds } from "@/lib/daily-queue";

/** مواعيد تنتظر إدخال السكرتارية فقط — ليست في الانتظار/المعاينة/تمت */
const PENDING_CHECKIN_STATUSES = [
  "CONFIRMED",
  "REMINDER_SENT",
  "DOCTOR_ASSIGNED",
] as const;

const ACTIVE_WAITING_STATUSES = [
  "ARRIVED",
  "WAITING",
  "WITH_DOCTOR",
  "SESSION_DONE",
] as const;

/**
 * مواعيد اليوم بانتظار الإدخال — منظّمة بدون تكرار:
 * - لا يُعاد إظهار موعد بعد دخوله الانتظار أو اكتماله
 * - مريض موجود الآن في التوجيه/الانتظار لا يظهر مرة ثانية إن حُجز له موعد آخر اليوم
 * - مريض واحد = صف واحد (أقرب موعد معلّق)
 */
export async function listSecretaryTodayPendingCheckIns() {
  const { start, end } = algiersDayBounds();

  const [appointments, activeWaiting] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        deletedAt: null,
        startAt: { gte: start, lt: end },
        status: { in: [...PENDING_CHECKIN_STATUSES] },
        waitingRoomEntry: null,
        patient: { deletedAt: null },
      },
      include: {
        patient: { include: { account: true } },
        doctor: { include: { user: true } },
        waitingRoomEntry: true,
      },
      orderBy: { startAt: "asc" },
      take: 150,
    }),
    prisma.waitingRoomEntry.findMany({
      where: {
        status: { in: [...ACTIVE_WAITING_STATUSES] },
        arrivedAt: { gte: start },
      },
      select: { patientId: true },
    }),
  ]);

  const busyPatientIds = new Set(activeWaiting.map((e) => e.patientId));

  const seenPatients = new Set<string>();
  const pending = [];

  for (const apt of appointments) {
    if (busyPatientIds.has(apt.patientId)) continue;
    if (seenPatients.has(apt.patientId)) continue;
    seenPatients.add(apt.patientId);
    pending.push(apt);
  }

  return { start, end, pending };
}

export async function countSecretaryTodayPendingCheckIns() {
  const { pending } = await listSecretaryTodayPendingCheckIns();
  return pending.length;
}
