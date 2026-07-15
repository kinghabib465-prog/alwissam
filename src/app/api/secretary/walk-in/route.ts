import { NextRequest, NextResponse } from "next/server";
import { AppointmentType } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createAppointmentRequest } from "@/lib/services/appointments";
import { createAuditLog } from "@/lib/audit/log";

/** تسجيل مريض عند الوصول (بدون هاتف ذكي / لا يعرف التسجيل عبر الموقع) */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["SECRETARY", "ADMIN"].includes(user.role.code)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const fullName = String(body.fullName || "").trim();
  const phone = String(body.phone || "").trim();
  const ageRaw = body.age;
  const city = String(body.city || "").trim();
  const chronicIllnesses = String(body.chronicIllnesses || "").trim();
  const reason = String(body.reason || "").trim();
  const typeRaw = String(body.appointmentType || "GENERAL_EXAM");
  const isFirstVisit =
    body.isFirstVisit === undefined ? true : Boolean(body.isFirstVisit);

  if (!fullName) {
    return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
  }
  if (!phone || phone.length < 8) {
    return NextResponse.json(
      { error: "رقم الهاتف مطلوب (8 أرقام على الأقل)" },
      { status: 400 },
    );
  }

  const validTypes = Object.values(AppointmentType);
  const appointmentType = validTypes.includes(typeRaw as AppointmentType)
    ? (typeRaw as AppointmentType)
    : AppointmentType.GENERAL_EXAM;

  if (appointmentType === AppointmentType.OTHER && reason.length < 2) {
    return NextResponse.json(
      { error: "اكتب سبب الزيارة عند اختيار «أخرى»" },
      { status: 400 },
    );
  }

  const age =
    ageRaw !== undefined && ageRaw !== "" && ageRaw !== null
      ? Number(ageRaw)
      : undefined;

  const request = await createAppointmentRequest({
    fullName,
    phone,
    age: Number.isFinite(age) ? age : undefined,
    city: city || undefined,
    chronicIllnesses: chronicIllnesses || undefined,
    reason: reason || undefined,
    appointmentType,
    isEmergency:
      body.isEmergency === true || appointmentType === AppointmentType.EMERGENCY,
    isPreviousPatient: !isFirstVisit,
    consentAccepted: true,
    additionalNotes: `سجّله السكرتير ${user.fullName}`,
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "WALK_IN_REGISTERED",
    entityType: "AppointmentRequest",
    entityId: request.id,
    newValue: { fullName, phone, queueNumber: request.queueNumber },
    reason: `تسجيل عند المدخل بواسطة ${user.fullName}`,
  });

  return NextResponse.json({
    ok: true,
    requestId: request.id,
    queueNumber: request.queueNumber,
  });
}
