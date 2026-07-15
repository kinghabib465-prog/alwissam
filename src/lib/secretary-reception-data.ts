import { prisma } from "@/lib/db/prisma";
import { algiersDayBounds } from "@/lib/daily-queue";
import { algiersWeekday } from "@/lib/secretary-today";
import { formatCurrencyDZD } from "@/lib/utils";
import {
  coalesceDoctorIdForDisplay,
  findCanonicalMananaDoctor,
} from "@/lib/resolve-clinic-doctors";
import type { DoctorWindow } from "@/components/secretary/DirectedDoctorPicker";
import { DayOfWeek } from "@prisma/client";

const STATUS_ORDER: Record<string, number> = {
  WITH_DOCTOR: 0,
  WAITING: 1,
  ARRIVED: 2,
  SESSION_DONE: 3,
};

/** بيانات الموجهين ليوم الجزائر — مصدر واحد لكل الشاشات */
export async function loadSecretaryDirectedWindows(): Promise<{
  todayLabelStart: Date;
  windows: DoctorWindow[];
  totalPatients: number;
}> {
  const { start, end } = algiersDayBounds();
  const today = algiersWeekday();
  const canonManana = await findCanonicalMananaDoctor();

  const [entries, doctors] = await Promise.all([
    prisma.waitingRoomEntry.findMany({
      where: {
        status: { not: "LEFT" },
        arrivedAt: { gte: start, lt: end },
      },
      include: {
        patient: true,
        doctor: { include: { user: true } },
        appointment: {
          include: {
            invoices: {
              where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { arrivedAt: "asc" },
    }),
    prisma.doctor.findMany({
      where: {
        OR: [
          { isActive: true, user: { deletedAt: null } },
          {
            waitingRoomEntries: {
              some: {
                status: { not: "LEFT" },
                arrivedAt: { gte: start, lt: end },
              },
            },
          },
        ],
      },
      include: {
        user: true,
        workingHours: {
          where: { isActive: true, dayOfWeek: today as DayOfWeek },
          take: 1,
        },
      },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const normalized = entries.map((e) => ({
    ...e,
    displayDoctorId: coalesceDoctorIdForDisplay(
      e.doctorId,
      e.doctor.user.fullName,
      canonManana?.id || null,
      e.doctor.isActive,
    ),
  }));

  let doctorList = doctors.filter(
    (d) =>
      d.isActive ||
      normalized.some((e) => e.displayDoctorId === d.id || e.doctorId === d.id),
  );

  if (canonManana && !doctorList.some((d) => d.id === canonManana.id)) {
    doctorList = [
      { ...canonManana, workingHours: [] } as (typeof doctors)[number],
      ...doctorList,
    ];
  }

  doctorList = doctorList.filter((d) => {
    if (!/منانة/.test(d.user.fullName)) return true;
    if (canonManana && d.id === canonManana.id) return true;
    return !canonManana;
  });

  doctorList.sort((a, b) => {
    const aPresent = a.workingHours.length > 0 ? 0 : 1;
    const bPresent = b.workingHours.length > 0 ? 0 : 1;
    if (aPresent !== bPresent) return aPresent - bPresent;
    if (a.type !== b.type) return a.type === "SPECIALIST" ? -1 : 1;
    return a.user.fullName.localeCompare(b.user.fullName, "ar");
  });

  const windows: DoctorWindow[] = doctorList.map((doc) => {
    const list = normalized
      .filter((e) => e.displayDoctorId === doc.id)
      .sort((a, b) => {
        const sa = STATUS_ORDER[a.status] ?? 9;
        const sb = STATUS_ORDER[b.status] ?? 9;
        if (sa !== sb) return sa - sb;
        return a.arrivedAt.getTime() - b.arrivedAt.getTime();
      });

    return {
      doctorId: doc.id,
      doctorName: doc.user.fullName,
      color: doc.colorCode || "#0d9488",
      typeLabel: doc.type === "SPECIALIST" ? "أخصائي" : "عام",
      count: list.length,
      waiting: list.filter(
        (e) => e.status === "WAITING" || e.status === "ARRIVED",
      ).length,
      withDoctor: list.filter((e) => e.status === "WITH_DOCTOR").length,
      needPay: list.filter(
        (e) =>
          e.status === "SESSION_DONE" && e.appointment.invoices.length > 0,
      ).length,
      patients: list.map((entry, index) => {
        const inv = entry.appointment.invoices[0];
        return {
          entryId: entry.id,
          patientId: entry.patientId,
          fullName: entry.patient.fullName?.trim() || "—",
          phone: entry.patient.phone,
          age: entry.patient.age,
          city: entry.patient.city,
          status: entry.status,
          unpaidInvoiceId: inv?.id ?? null,
          amountLabel: inv
            ? formatCurrencyDZD(Number(inv.remainingAmount))
            : null,
          queueOrder: index + 1,
        };
      }),
    };
  });

  return {
    todayLabelStart: start,
    windows,
    totalPatients: normalized.length,
  };
}

export async function loadSecretaryOpenPayments() {
  const [openInvoices, recentPayments] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
      include: {
        patient: true,
        appointment: { include: { waitingRoomEntry: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.payment.findMany({
      include: {
        invoice: { include: { patient: true } },
      },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      take: 80,
    }),
  ]);

  return {
    openInvoices: openInvoices.map((inv) => ({
      id: inv.id,
      patientName: inv.patient.fullName,
      amount: Number(inv.remainingAmount),
      entryId: inv.appointment?.waitingRoomEntry?.id,
      appointmentId: inv.appointmentId,
      createdAt: inv.createdAt.toISOString(),
    })),
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      patientName: p.invoice.patient.fullName,
      amount: Number(p.amount),
      receiptNumber: p.receiptNumber,
      paymentDate: p.paymentDate.toISOString(),
    })),
  };
}
