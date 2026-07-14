import { NextRequest, NextResponse } from "next/server";
import { bookAppointmentSchema } from "@/lib/validations";
import { createAppointmentRequest } from "@/lib/services/appointments";
import { rateLimit } from "@/lib/auth/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = await rateLimit({
    key: `book:${ip}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "تم إرسال عدد كبير من الطلبات. حاول لاحقًا." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = bookAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "بيانات غير صالحة" },
      { status: 400 },
    );
  }

  const request = await createAppointmentRequest(parsed.data);
  const queueNumber = String(
    (request as { queueNumber?: number }).queueNumber ||
      request.requestNumber.match(/^\d{8}-(\d+)$/)?.[1] ||
      "",
  );

  return NextResponse.json({
    ok: true,
    requestNumber: request.requestNumber,
    queueNumber,
    id: request.id,
    message: "تم تسجيلك",
  });
}
