import { NextRequest, NextResponse } from "next/server";
import { AppointmentType } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  directPatientFromRequest,
  removePatientBeforeDoctor,
  updateReceptionRequestInfo,
} from "@/lib/services/appointments";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !["SECRETARY", "ADMIN"].includes(user.role.code)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const csrf = req.headers.get("x-csrf-token");
  if (!csrf || csrf !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  try {
    if (action === "update") {
      const ageRaw = body.age;
      let age: number | null | undefined = undefined;
      if (ageRaw === "" || ageRaw === null) age = null;
      else if (ageRaw !== undefined) {
        const n = Number(ageRaw);
        age = Number.isFinite(n) ? n : undefined;
      }

      const typeRaw =
        body.appointmentType !== undefined
          ? String(body.appointmentType)
          : undefined;
      const appointmentType =
        typeRaw &&
        Object.values(AppointmentType).includes(typeRaw as AppointmentType)
          ? (typeRaw as AppointmentType)
          : undefined;

      const updated = await updateReceptionRequestInfo({
        requestId: id,
        userId: user.id,
        roleCode: user.role.code,
        userName: user.fullName,
        fullName:
          body.fullName !== undefined ? String(body.fullName) : undefined,
        phone: body.phone !== undefined ? String(body.phone) : undefined,
        age,
        city: body.city !== undefined ? String(body.city) : undefined,
        chronicIllnesses:
          body.chronicIllnesses !== undefined
            ? String(body.chronicIllnesses)
            : undefined,
        appointmentType,
        reason: body.reason !== undefined ? String(body.reason) : undefined,
        isFirstVisit:
          body.isFirstVisit === undefined
            ? undefined
            : Boolean(body.isFirstVisit),
      });

      return NextResponse.json({
        message: "تم حفظ بيانات المريض",
        request: {
          id: updated.id,
          fullName: updated.fullName,
          phone: updated.phone,
          age: updated.age,
          city: updated.city,
          chronicIllnesses: updated.chronicIllnesses,
          appointmentType: updated.appointmentType,
          reason: updated.reason,
          isPreviousPatient: updated.isPreviousPatient,
        },
      });
    }

    if (action === "reject" || action === "remove") {
      await removePatientBeforeDoctor({
        requestId: id,
        userId: user.id,
        roleCode: user.role.code,
        userName: user.fullName,
      });
      return NextResponse.json({ message: "تم حذف المريض من الاستقبال" });
    }

    if (action === "direct") {
      if (!body.doctorId) {
        return NextResponse.json({ error: "يرجى اختيار الطبيب" }, { status: 400 });
      }

      const result = await directPatientFromRequest({
        requestId: id,
        doctorId: body.doctorId,
        userId: user.id,
        roleCode: user.role.code,
        userName: user.fullName,
        note: body.note,
      });

      return NextResponse.json({
        message: `تم توجيه المريض إلى الطبيب بواسطة ${user.fullName}`,
        appointmentId: result.appointment.id,
      });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "فشلت العملية" },
      { status: 400 },
    );
  }
}
