import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { wipeAllPatientData } from "@/lib/services/wipe-patients";

const CONFIRM_PHRASE = "مسح كل المرضى";

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role.code !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح — لمنانة فقط" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (String(body.confirmation || "").trim() !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: `للتأكيد اكتبي بالضبط: ${CONFIRM_PHRASE}` },
      { status: 400 },
    );
  }

  try {
    const deleted = await wipeAllPatientData({
      confirmed: true,
      actorUserId: user.id,
      actorRoleCode: user.role.code,
      actorName: user.fullName,
    });
    return NextResponse.json({
      ok: true,
      message: "تم مسح كل المرضى والبيانات — حسابات الطاقم محفوظة",
      deleted,
    });
  } catch (error) {
    console.error("[wipe-patients API]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "تعذر مسح بيانات المرضى",
      },
      { status: 500 },
    );
  }
}
