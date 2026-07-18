import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createAuditLog } from "@/lib/audit/log";
import { prisma } from "@/lib/db/prisma";
import { algiersYmdBounds } from "@/lib/clinic-date";

const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: unknown) {
  const date = String(value || "").trim();
  if (!YMD_PATTERN.test(date)) return null;
  const { start, end } = algiersYmdBounds(date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { date, start, end };
}

async function requireOwner(req: NextRequest) {
  const user = await getCurrentUser();
  // هذه العملية الحساسة لحساب منانة الإداري فقط، لا لأي طبيب أخصائي.
  if (!user || user.role.code !== "ADMIN") {
    return { error: "غير مصرح", status: 401 } as const;
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return { error: "رمز الحماية غير صالح", status: 403 } as const;
  }
  return { user } as const;
}

type DayDatabase = Pick<
  typeof prisma,
  | "appointmentRequest"
  | "appointment"
  | "waitingRoomEntry"
  | "invoice"
  | "payment"
  | "treatmentSession"
  | "orthodonticSession"
>;

async function inspectDay(
  start: Date,
  end: Date,
  db: DayDatabase = prisma,
) {
  const appointments = await db.appointment.findMany({
    where: {
      deletedAt: null,
      startAt: { gte: start, lt: end },
    },
    select: { id: true },
  });
  const appointmentIds = appointments.map((row) => row.id);

  const requests = await db.appointmentRequest.findMany({
    where: {
      OR: [
        { createdAt: { gte: start, lt: end } },
        ...(appointmentIds.length
          ? [{ appointmentId: { in: appointmentIds } }]
          : []),
      ],
    },
    select: { id: true },
  });
  const requestIds = requests.map((row) => row.id);

  const [waitingEntries, invoices, payments, treatmentSessions, orthoSessions] =
    await Promise.all([
      appointmentIds.length
        ? db.waitingRoomEntry.count({
            where: { appointmentId: { in: appointmentIds } },
          })
        : 0,
      appointmentIds.length
        ? db.invoice.count({
            where: { appointmentId: { in: appointmentIds } },
          })
        : 0,
      appointmentIds.length
        ? db.payment.count({
            where: {
              invoice: { appointmentId: { in: appointmentIds } },
            },
          })
        : 0,
      appointmentIds.length
        ? db.treatmentSession.count({
            where: { appointmentId: { in: appointmentIds } },
          })
        : 0,
      appointmentIds.length
        ? db.orthodonticSession.count({
            where: { appointmentId: { in: appointmentIds } },
          })
        : 0,
    ]);

  const protectedRecords =
    invoices + payments + treatmentSessions + orthoSessions;

  return {
    requestIds,
    appointmentIds,
    counts: {
      registrations: requestIds.length,
      appointments: appointmentIds.length,
      waitingEntries,
      invoices,
      payments,
      treatmentSessions,
      orthodonticSessions: orthoSessions,
    },
    protectedRecords,
    canDelete: protectedRecords === 0,
  };
}

export async function POST(req: NextRequest) {
  const auth = await requireOwner(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = parseDate(body.date);
  if (!parsed) {
    return NextResponse.json({ error: "التاريخ غير صالح" }, { status: 400 });
  }

  const result = await inspectDay(parsed.start, parsed.end);
  return NextResponse.json({
    ok: true,
    date: parsed.date,
    counts: result.counts,
    canDelete: result.canDelete,
    blockedReason: result.canDelete
      ? null
      : "يحتوي هذا اليوم على بيانات مالية أو جلسات علاجية؛ لا يسمح النظام بحذفها نهائياً.",
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireOwner(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = parseDate(body.date);
  if (!parsed) {
    return NextResponse.json({ error: "التاريخ غير صالح" }, { status: 400 });
  }
  if (String(body.confirmation || "").trim() !== parsed.date) {
    return NextResponse.json(
      { error: "اكتبي التاريخ نفسه في خانة التأكيد" },
      { status: 400 },
    );
  }

  try {
    const deleted = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`alwisam-day-delete-${parsed.date}`}))`;

      const snapshot = await inspectDay(parsed.start, parsed.end, tx);
      if (!snapshot.canDelete) {
        throw new Error(
          "تعذر الحذف: اليوم يحتوي على فاتورة/دفعة أو جلسة علاجية محفوظة.",
        );
      }

      const entityIds = [...snapshot.requestIds, ...snapshot.appointmentIds];
      if (entityIds.length) {
        await tx.notification.deleteMany({
          where: { entityId: { in: entityIds } },
        });
      }

      if (snapshot.requestIds.length) {
        await tx.appointmentRequest.deleteMany({
          where: { id: { in: snapshot.requestIds } },
        });
      }

      if (snapshot.appointmentIds.length) {
        await tx.waitingRoomEntry.deleteMany({
          where: { appointmentId: { in: snapshot.appointmentIds } },
        });
        await tx.appointmentStatusHistory.deleteMany({
          where: { appointmentId: { in: snapshot.appointmentIds } },
        });
        await tx.appointment.deleteMany({
          where: { id: { in: snapshot.appointmentIds } },
        });
      }

      return snapshot.counts;
    });

    await createAuditLog({
      userId: auth.user.id,
      roleCode: auth.user.role.code,
      action: "DAY_OPERATIONAL_RECORDS_DELETED",
      entityType: "ClinicDay",
      entityId: parsed.date,
      oldValue: deleted,
      reason: `حذف سجل تشغيل يوم ${parsed.date} بواسطة ${auth.user.fullName}`,
    });

    return NextResponse.json({
      ok: true,
      message: `تم حذف سجل تشغيل يوم ${parsed.date}`,
      deleted,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر حذف سجل اليوم" },
      { status: 409 },
    );
  }
}
