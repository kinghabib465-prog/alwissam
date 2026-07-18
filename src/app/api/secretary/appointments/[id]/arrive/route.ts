import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { checkInScheduledAppointment } from "@/lib/services/appointments";

/** تسجيل وصول موعد مجدول — نفس قواعد scheduled-check-in */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !["SECRETARY", "ADMIN"].includes(user.role.code)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const doctorId = body.doctorId ? String(body.doctorId) : undefined;

  try {
    const result = await checkInScheduledAppointment({
      appointmentId: id,
      userId: user.id,
      roleCode: user.role.code,
      userName: user.fullName,
      doctorId,
    });
    return NextResponse.json({ ok: true, entry: result.entry });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "فشلت العملية" },
      { status: 400 },
    );
  }
}
