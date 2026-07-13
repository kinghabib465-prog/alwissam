import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { loadDoctorAvailability } from "@/lib/doctor-availability.server";
import { prisma } from "@/lib/db/prisma";

/** أيام وساعات عمل طبيب — للمواعيد والتوجيه */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (
    !user ||
    !["DOCTOR_SPECIALIST", "DOCTOR_GENERAL", "ADMIN", "SECRETARY"].includes(
      user.role.code,
    )
  ) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const doctorIdParam = req.nextUrl.searchParams.get("doctorId");
  let doctorId = doctorIdParam || "";

  if (!doctorId) {
    const self = await prisma.doctor.findFirst({
      where: { userId: user.id, isActive: true },
    });
    doctorId = self?.id || "";
  }
  if (!doctorId) {
    return NextResponse.json({ error: "معرّف الطبيب مطلوب" }, { status: 400 });
  }

  const availability = await loadDoctorAvailability(doctorId);
  if (!availability) {
    return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, availability });
}
