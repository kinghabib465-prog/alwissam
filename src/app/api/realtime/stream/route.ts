import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "connected", at: new Date().toISOString() });

      const interval = setInterval(async () => {
        try {
          const [requests, waiting] = await Promise.all([
            prisma.appointmentRequest.count({
              where: { status: { in: ["NEW_REQUEST", "EMERGENCY"] } },
            }),
            prisma.waitingRoomEntry.count({
              where: { status: { in: ["ARRIVED", "WAITING"] } },
            }),
          ]);
          send({ type: "stats", requests, waiting, at: new Date().toISOString() });
        } catch {
          send({ type: "heartbeat", at: new Date().toISOString() });
        }
      }, 5000);

      const close = () => {
        clearInterval(interval);
        controller.close();
      };

      // @ts-expect-error abort signal on request not available here; cleanup via cancel
      controller._cleanup = close;
    },
    cancel() {},
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
