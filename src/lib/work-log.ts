import { prisma } from "@/lib/db/prisma";
import { formatClinicDate } from "@/lib/clinic-date";
import { formatTime } from "@/lib/utils";

/** مفتاح يوم الجزائر YYYY-MM-DD */
export function algiersYmd(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export type WorkLogPatientRow = {
  id: string;
  patientName: string;
  phone: string;
  arrivedAtIso: string;
  arrivedTime: string;
  doctorName: string;
  doctorId: string;
  status: string;
  paidAmount: number;
};

export type WorkLogDoctorSummary = {
  doctorId: string;
  doctorName: string;
  present: boolean;
  patientsCount: number;
  paidTotal: number;
};

export type WorkLogDay = {
  ymd: string;
  dateLabel: string;
  patientsCount: number;
  paidTotal: number;
  doctorsPresent: WorkLogDoctorSummary[];
  patients: WorkLogPatientRow[];
  firstLogin?: string | null;
  lastLogin?: string | null;
};

export type WorkLogPayload = {
  staffName: string;
  roleKind: "secretary" | "doctor";
  days: WorkLogDay[];
};

/** سجل عمل مهني: أيام متسلسلة (الأحدث أولاً) + مرضى + دفع + حضور أطباء */
export async function loadStaffWorkLog(params: {
  staffUserId: string;
  doctorId?: string | null;
  isSecretary: boolean;
  daysBack?: number;
}): Promise<WorkLogPayload> {
  const daysBack = params.daysBack ?? 45;
  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  since.setHours(0, 0, 0, 0);

  const staff = await prisma.user.findUnique({
    where: { id: params.staffUserId },
    select: { fullName: true },
  });

  const waitingWhere = params.isSecretary
    ? { arrivedAt: { gte: since } }
    : {
        arrivedAt: { gte: since },
        doctorId: params.doctorId || "__none__",
      };

  const [entries, payments, logins] = await Promise.all([
    prisma.waitingRoomEntry.findMany({
      where: waitingWhere,
      include: {
        patient: true,
        doctor: { include: { user: true } },
        appointment: {
          include: {
            invoices: {
              include: {
                payments: {
                  where: { status: "COMPLETED" },
                },
              },
            },
          },
        },
      },
      orderBy: { arrivedAt: "asc" },
      take: 2000,
    }),
    prisma.payment.findMany({
      where: {
        paymentDate: { gte: since },
        status: "COMPLETED",
        ...(params.isSecretary
          ? { createdById: params.staffUserId }
          : {
              invoice: { doctorId: params.doctorId || undefined },
            }),
      },
      include: {
        invoice: {
          include: {
            patient: true,
            appointment: {
              include: {
                doctor: { include: { user: true } },
                waitingRoomEntry: true,
              },
            },
          },
        },
      },
      orderBy: { paymentDate: "asc" },
      take: 2000,
    }),
    prisma.loginHistory.findMany({
      where: {
        userId: params.staffUserId,
        success: true,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "asc" },
      take: 500,
    }),
  ]);

  type Acc = {
    ymd: string;
    patients: Map<string, WorkLogPatientRow>;
    doctorMap: Map<string, WorkLogDoctorSummary>;
    paidTotal: number;
    logins: Date[];
  };

  const byDay = new Map<string, Acc>();

  function dayAcc(ymd: string): Acc {
    let a = byDay.get(ymd);
    if (!a) {
      a = {
        ymd,
        patients: new Map(),
        doctorMap: new Map(),
        paidTotal: 0,
        logins: [],
      };
      byDay.set(ymd, a);
    }
    return a;
  }

  for (const entry of entries) {
    const ymd = algiersYmd(entry.arrivedAt);
    const acc = dayAcc(ymd);
    const paid = entry.appointment.invoices.reduce(
      (sum, inv) =>
        sum +
        inv.payments.reduce((s, p) => s + Number(p.amount), 0),
      0,
    );

    const row: WorkLogPatientRow = {
      id: entry.id,
      patientName: entry.patient.fullName,
      phone: entry.patient.phone,
      arrivedAtIso: entry.arrivedAt.toISOString(),
      arrivedTime: formatTime(entry.arrivedAt),
      doctorName: entry.doctor.user.fullName,
      doctorId: entry.doctorId,
      status: entry.status,
      paidAmount: paid,
    };
    acc.patients.set(entry.id, row);

    const d = acc.doctorMap.get(entry.doctorId) || {
      doctorId: entry.doctorId,
      doctorName: entry.doctor.user.fullName,
      present: true,
      patientsCount: 0,
      paidTotal: 0,
    };
    d.present = true;
    d.patientsCount += 1;
    d.paidTotal += paid;
    acc.doctorMap.set(entry.doctorId, d);
    acc.paidTotal += paid;
  }

  // مدفوعات غير مربوطة بانتظار — تُحسب في ملخص الطبيب/اليوم
  for (const pay of payments) {
    const ymd = algiersYmd(pay.paymentDate);
    const acc = dayAcc(ymd);
    const amount = Number(pay.amount);
    const doctorId = pay.invoice.doctorId;
    const doctorName =
      pay.invoice.appointment?.doctor.user.fullName || "—";

    if (doctorId) {
      const d = acc.doctorMap.get(doctorId) || {
        doctorId,
        doctorName,
        present: false,
        patientsCount: 0,
        paidTotal: 0,
      };
      // لا نضاعف إن دُفع عبر فاتورة الانتظار نفسها
      const alreadyInWaiting = pay.invoice.appointment?.waitingRoomEntry
        ? acc.patients.has(pay.invoice.appointment.waitingRoomEntry.id)
        : false;
      if (!alreadyInWaiting) {
        d.paidTotal += amount;
        acc.paidTotal += amount;
      }
      d.present = d.present || !!pay.invoice.appointment;
      acc.doctorMap.set(doctorId, d);
    } else if (
      !pay.invoice.appointment?.waitingRoomEntry ||
      !acc.patients.has(pay.invoice.appointment.waitingRoomEntry.id)
    ) {
      acc.paidTotal += amount;
    }
  }

  for (const login of logins) {
    const ymd = algiersYmd(login.createdAt);
    dayAcc(ymd).logins.push(login.createdAt);
  }

  const days: WorkLogDay[] = [...byDay.values()]
    .map((acc) => {
      const patients = [...acc.patients.values()].sort(
        (a, b) =>
          new Date(a.arrivedAtIso).getTime() -
          new Date(b.arrivedAtIso).getTime(),
      );
      const doctorsPresent = [...acc.doctorMap.values()].sort(
        (a, b) => b.paidTotal - a.paidTotal,
      );
      const logSorted = [...acc.logins].sort(
        (a, b) => a.getTime() - b.getTime(),
      );
      return {
        ymd: acc.ymd,
        dateLabel: formatClinicDate(`${acc.ymd}T12:00:00`),
        patientsCount: patients.length,
        paidTotal: acc.paidTotal,
        doctorsPresent,
        patients,
        firstLogin: logSorted[0] ? formatTime(logSorted[0]) : null,
        lastLogin: logSorted.length
          ? formatTime(logSorted[logSorted.length - 1]!)
          : null,
      };
    })
    .sort((a, b) => (a.ymd < b.ymd ? 1 : a.ymd > b.ymd ? -1 : 0));

  return {
    staffName: staff?.fullName || "",
    roleKind: params.isSecretary ? "secretary" : "doctor",
    days,
  };
}
