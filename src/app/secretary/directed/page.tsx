import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { navSecretaryAr } from "@/i18n/ar";
import {
  DirectedDoctorPicker,
  type DoctorWindow,
} from "@/components/secretary/DirectedDoctorPicker";
import { formatCurrencyDZD } from "@/lib/utils";
import { DayOfWeek } from "@prisma/client";
import { algiersDayBounds } from "@/lib/daily-queue";
import { algiersWeekday } from "@/lib/secretary-today";
import { formatClinicDate } from "@/lib/clinic-date";
import {
  coalesceDoctorIdForDisplay,
  findCanonicalMananaDoctor,
} from "@/lib/resolve-clinic-doctors";

export const dynamic = "force-dynamic";

const STATUS_ORDER: Record<string, number> = {
  WITH_DOCTOR: 0,
  WAITING: 1,
  ARRIVED: 2,
  SESSION_DONE: 3,
};

/** الموجهون — يوم الجزائر · مواعيد منانة تظهر بأسماء المرضى تحت حسابها الرسمي */
export default async function SecretaryDirectedPage() {
  const user = await requireUser(["SECRETARY", "ADMIN"]);
  const { start, end } = algiersDayBounds();
  const today = algiersWeekday();
  const todayLabel = formatClinicDate(start);
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
          // لعرض نوافذ من لديها مرضى اليوم حتى لو عُطّل الحساب المكرر
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

  // دمج مرضى منانة المكررة تحت الحساب الرسمي
  const normalized = entries.map((e) => {
    const displayDoctorId = coalesceDoctorIdForDisplay(
      e.doctorId,
      e.doctor.user.fullName,
      canonManana?.id || null,
      e.doctor.isActive,
    );
    return { ...e, displayDoctorId };
  });

  const activeDoctors = doctors.filter(
    (d) =>
      d.isActive ||
      normalized.some((e) => e.displayDoctorId === d.id || e.doctorId === d.id),
  );

  // تأكد من وجود منانة الرسمية في القائمة
  let doctorList = activeDoctors;
  if (canonManana && !doctorList.some((d) => d.id === canonManana.id)) {
    doctorList = [
      {
        ...canonManana,
        workingHours: [],
      } as (typeof doctors)[number],
      ...doctorList,
    ];
  }

  // أخفِ المكرّرين باسم منانة غير الرسمي
  const seenManana = new Set<string>();
  doctorList = doctorList.filter((d) => {
    if (!/منانة/.test(d.user.fullName)) return true;
    if (canonManana && d.id === canonManana.id) return true;
    if (canonManana) return false;
    const key = d.user.fullName.replace(/\s+/g, "");
    if (seenManana.has(key)) return false;
    seenManana.add(key);
    return true;
  });

  const sortedDoctors = [...doctorList].sort((a, b) => {
    const aPresent = a.workingHours.length > 0 ? 0 : 1;
    const bPresent = b.workingHours.length > 0 ? 0 : 1;
    if (aPresent !== bPresent) return aPresent - bPresent;
    if (a.type !== b.type) return a.type === "SPECIALIST" ? -1 : 1;
    return a.user.fullName.localeCompare(b.user.fullName, "ar");
  });

  const windows: DoctorWindow[] = sortedDoctors.map((doc) => {
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

  const hasAny = normalized.length > 0;

  return (
    <DashboardShell items={navSecretaryAr as never} userName={user.fullName}>
      <TopHeader
        title="المرضى الموجَّهون"
        subtitle={`${todayLabel} — أسماء المرضى تحت طبيبهم (منانة الرسمي)`}
      />

      {!hasAny ? (
        <Card>
          <EmptyState
            title="لا مرضى موجَّهين اليوم"
            description="من «مواعيد اليوم» أو تسجيل المدخل → توجيه → يظهر الاسم هنا."
          />
        </Card>
      ) : (
        <DirectedDoctorPicker doctors={windows} csrfToken={user.csrfToken} />
      )}
    </DashboardShell>
  );
}
