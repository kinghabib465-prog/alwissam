import { PublicFooter, PublicHeader } from "@/components/public/PublicChrome";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/db/prisma";
import { dayOfWeekAr } from "@/i18n/ar";
import { DAYS_ORDER } from "@/lib/days-ar";
import { toLatinDigits } from "@/lib/latin-digits";

export const dynamic = "force-dynamic";

type DoctorWithRelations = Awaited<
  ReturnType<
    typeof prisma.doctor.findMany<{
      include: { user: true; workingHours: true };
    }>
  >
>[number];

function organizeHours(
  hours: DoctorWithRelations["workingHours"],
): { dayLabel: string; lines: string[] }[] {
  const byDay = new Map<string, { morning?: string; evening?: string; day?: string }>();

  for (const wh of hours) {
    if (!wh.isActive) continue;
    const row = byDay.get(wh.dayOfWeek) || {};
    const range = `${toLatinDigits(wh.startTime)}–${toLatinDigits(wh.endTime)}`;
    if (wh.shift === "MORNING") row.morning = range;
    else if (wh.shift === "EVENING") row.evening = range;
    else row.day = range;
    byDay.set(wh.dayOfWeek, row);
  }

  return DAYS_ORDER.flatMap((day) => {
    const row = byDay.get(day);
    if (!row) return [];
    const lines: string[] = [];
    if (row.morning) lines.push(`صباح ${row.morning}`);
    if (row.evening) lines.push(`مساء ${row.evening}`);
    if (!row.morning && !row.evening && row.day) lines.push(`دوام ${row.day}`);
    if (lines.length === 0) return [];
    return [{ dayLabel: dayOfWeekAr[day] || day, lines }];
  });
}

export default async function DoctorsPage() {
  let doctors: DoctorWithRelations[] = [];
  try {
    doctors = await prisma.doctor.findMany({
      where: { isActive: true },
      include: { user: true, workingHours: { where: { isActive: true } } },
      orderBy: { type: "desc" },
    });
  } catch {
    doctors = [];
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-navy">الأطباء</h1>
        <p className="mt-2 text-muted">فريق عيادة الوسام لطب الأسنان</p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {doctors.length === 0 ? (
            <>
              <Card>
                <h2 className="text-xl font-bold text-navy">الدكتور منانة فؤاد</h2>
                <p className="mt-2 text-sm text-muted">
                  تقويم الأسنان · التركيبات · الجراحة · الحالات متعددة الحصص
                </p>
                <p className="mt-3 text-sm">الأحد، الإثنين، الثلاثاء</p>
                <p className="font-latin text-sm tabular-nums">
                  07:00–14:00 · 16:00–22:00
                </p>
              </Card>
              <Card>
                <h2 className="text-xl font-bold text-navy">الدكتور قعري أسامة</h2>
                <p className="mt-2 text-sm text-muted">
                  الحالات الاستعجالية · العلاج العام · الحشو والتنظيف · الخلع البسيط
                </p>
                <p className="mt-3 text-sm">يعمل يوميًا ما عدا الجمعة</p>
                <p className="text-sm text-muted">ساعات العمل تُضبط من إعدادات الإدارة</p>
              </Card>
            </>
          ) : (
            doctors.map((doctor) => {
              const schedule = organizeHours(doctor.workingHours);
              return (
                <Card key={doctor.id}>
                  <h2 className="text-xl font-bold text-navy">
                    {doctor.user.fullName}
                  </h2>
                  <p className="mt-2 text-sm text-muted">{doctor.specialtyAr}</p>
                  {schedule.length === 0 ? (
                    <p className="mt-4 text-sm text-muted">لا مواعيد عمل مفعّلة</p>
                  ) : (
                    <ul className="mt-4 space-y-2 text-sm">
                      {schedule.map((row) => (
                        <li
                          key={row.dayLabel}
                          className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
                        >
                          <span className="min-w-[4.5rem] font-semibold text-navy">
                            {row.dayLabel}
                          </span>
                          <span className="font-latin tabular-nums text-muted">
                            {row.lines.join(" · ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
