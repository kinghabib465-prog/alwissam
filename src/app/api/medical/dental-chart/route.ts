import { NextRequest, NextResponse } from "next/server";
import { ToothState } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (
    !user ||
    !["DOCTOR_GENERAL", "DOCTOR_SPECIALIST", "ADMIN"].includes(user.role.code)
  ) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json();
  const patientId = String(body.patientId || "");
  const toothNumber = Number(body.toothNumber);
  const state = body.state as ToothState;
  if (!patientId || !toothNumber || !state) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  let chart = await prisma.dentalChart.findUnique({ where: { patientId } });
  if (!chart) {
    chart = await prisma.dentalChart.create({ data: { patientId } });
  }

  const existing = await prisma.dentalToothState.findFirst({
    where: { dentalChartId: chart.id, toothNumber, surface: null },
    orderBy: { updatedAt: "desc" },
  });

  const doctor = await prisma.doctor.findFirst({ where: { userId: user.id } });

  const updated = existing
    ? await prisma.dentalToothState.update({
        where: { id: existing.id },
        data: {
          previousState: existing.state,
          state,
          doctorId: doctor?.id,
        },
      })
    : await prisma.dentalToothState.create({
        data: {
          dentalChartId: chart.id,
          toothNumber,
          state,
          doctorId: doctor?.id,
        },
      });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "DENTAL_CHART_UPDATE",
    entityType: "DentalToothState",
    entityId: updated.id,
    oldValue: existing ? { state: existing.state } : null,
    newValue: { toothNumber, state },
  });

  return NextResponse.json({ ok: true, tooth: updated });
}
