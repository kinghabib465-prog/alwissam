import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { checkInScheduledAppointment } from "@/lib/services/appointments";

/** إدخال موعد مجدول (مريض بحساب) إلى الانتظار من الاستقبال */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["SECRETARY", "ADMIN"].includes(user.role.code)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const appointmentId = String(body.appointmentId || "");
  const doctorId = body.doctorId ? String(body.doctorId) : undefined;
  if (!appointmentId) {
    return NextResponse.json({ error: "معرّف الموعد مطلوب" }, { status: 400 });
  }

  try {
    const result = await checkInScheduledAppointment({
      appointmentId,
      doctorId,
      userId: user.id,
      roleCode: user.role.code,
      userName: user.fullName,
    });
    return NextResponse.json({
      ok: true,
      entryId: result.entry.id,
      message: "تم إدخال المريض للانتظار",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "فشلت العملية" },
      { status: 400 },
    );
  }
}
