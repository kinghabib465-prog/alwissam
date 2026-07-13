import { PublicFooter, PublicHeader } from "@/components/public/PublicChrome";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/db/prisma";
import { dayOfWeekAr } from "@/i18n/ar";

export const dynamic = "force-dynamic";

type DoctorWithRelations = Awaited<
  ReturnType<
    typeof prisma.doctor.findMany<{
      include: { user: true; workingHours: true };
    }>
  >
>[number];

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
                <p className="font-latin text-sm">08:00–13:30 · 17:00–21:00</p>
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
            doctors.map((doctor) => (
              <Card key={doctor.id}>
                <h2 className="text-xl font-bold text-navy">{doctor.user.fullName}</h2>
                <p className="mt-2 text-sm text-muted">{doctor.specialtyAr}</p>
                <ul className="mt-4 space-y-1 text-sm">
                  {doctor.workingHours.map((wh) => (
                    <li key={wh.id} className="font-latin">
                      {dayOfWeekAr[wh.dayOfWeek]}: {wh.startTime}–{wh.endTime}
                    </li>
                  ))}
                </ul>
              </Card>
            ))
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
