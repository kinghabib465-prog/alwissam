import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";

/** موافقة الدكتور منانة على بدء التقويم وتفعيل حساب المريض */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["DOCTOR_SPECIALIST", "ADMIN"].includes(user.role.code)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const patientId = String(body.patientId || "");
  const approve = body.approve !== false;
  if (!patientId) {
    return NextResponse.json({ error: "معرّف المريض مطلوب" }, { status: 400 });
  }

  const account = await prisma.patientAccount.findUnique({
    where: { patientId },
    include: { patient: true, user: true },
  });
  if (!account) {
    return NextResponse.json({ error: "لا يوجد حساب معلّق لهذا المريض" }, { status: 404 });
  }

  if (!approve) {
    await prisma.$transaction([
      prisma.patientAccount.update({
        where: { id: account.id },
        data: { status: "INACTIVE" },
      }),
      prisma.user.update({
        where: { id: account.userId },
        data: { status: "INACTIVE" },
      }),
      prisma.orthodonticCase.updateMany({
        where: { patientId, status: "NOT_STARTED" },
        data: {
          status: "CANCELLED",
          notes: `رفض بدء التقويم بواسطة ${user.fullName}`,
        },
      }),
    ]);
    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "ORTHO_START_REJECTED",
      entityType: "Patient",
      entityId: patientId,
      reason: `رفض بواسطة ${user.fullName}`,
    });
    return NextResponse.json({ message: "تم رفض طلب بدء التقويم" });
  }

  await prisma.$transaction([
    prisma.patientAccount.update({
      where: { id: account.id },
      data: {
        status: "ACTIVE",
        activatedAt: new Date(),
        activatedById: user.id,
      },
    }),
    prisma.user.update({
      where: { id: account.userId },
      data: { status: "ACTIVE" },
    }),
    prisma.orthodonticCase.updateMany({
      where: { patientId, status: "NOT_STARTED" },
      data: {
        status: "IN_PROGRESS",
        startDate: new Date(),
        notes: `تمت الموافقة على بدء التقويم بواسطة ${user.fullName}`,
      },
    }),
  ]);

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "ORTHO_START_APPROVED",
    entityType: "Patient",
    entityId: patientId,
    reason: `موافقة بدء التقويم وتفعيل الحساب بواسطة ${user.fullName}`,
  });

  return NextResponse.json({
    message: `تمت الموافقة على بدء التقويم وتفعيل حساب ${account.patient.fullName}`,
  });
}
