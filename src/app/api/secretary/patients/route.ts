import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { patientCreateSchema } from "@/lib/validations";
import { generateNumber } from "@/lib/utils";
import { createAuditLog } from "@/lib/audit/log";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["SECRETARY", "ADMIN"].includes(user.role.code)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patientCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "بيانات غير صالحة" },
      { status: 400 },
    );
  }

  const existing = await prisma.patient.findFirst({
    where: { phone: parsed.data.phone, deletedAt: null },
  });
  if (existing) {
    return NextResponse.json(
      { error: "يوجد مريض بنفس رقم الهاتف" },
      { status: 409 },
    );
  }

  const patient = await prisma.patient.create({
    data: {
      patientNumber: generateNumber("PAT"),
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
      age: parsed.data.age,
      gender: parsed.data.gender,
      city: parsed.data.city,
      notes: parsed.data.notes,
    },
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "PATIENT_CREATED",
    entityType: "Patient",
    entityId: patient.id,
    newValue: patient,
    reason: `تم إنشاء المريض بواسطة ${user.fullName}`,
  });

  return NextResponse.json({ ok: true, patient });
}
