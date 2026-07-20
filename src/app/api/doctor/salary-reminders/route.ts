import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { isSalaryReminderActive } from "@/lib/secretary-salary";

/** إشعارات يوم راتب السكرتارية — لمنانة/الأدمن */
export async function GET() {
  const user = await getCurrentUser();
  if (
    !user ||
    !["ADMIN", "DOCTOR_SPECIALIST"].includes(user.role.code)
  ) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const secretaries = await prisma.secretaryProfile.findMany({
    where: { user: { status: "ACTIVE", deletedAt: null } },
    include: { user: { select: { fullName: true } } },
  });

  const due = secretaries
    .filter((s) =>
      isSalaryReminderActive(s.salaryDayOfMonth, s.salaryPaidYearMonth),
    )
    .map((s) => ({
      id: s.id,
      userId: s.userId,
      name: s.user.fullName,
      salaryDayOfMonth: s.salaryDayOfMonth,
    }));

  return NextResponse.json({
    ok: true,
    dueCount: due.length,
    due,
  });
}
