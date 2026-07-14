import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/public/PublicChrome";
import { PublicRegisterForm } from "@/components/public/PublicRegisterForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getPublicT } from "@/i18n/get-locale";
import { loadPublicPagesContent } from "@/lib/public-pages";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const content = await loadPublicPagesContent();
  const { t } = await getPublicT();

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <section className="relative overflow-hidden">
        <div className="dashboard-gradient absolute inset-0 opacity-95" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="max-w-2xl text-white">
            <p className="text-sm font-semibold text-soft-teal">{t.brand}</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
              {t.heroTitle}
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/85">
              {t.heroSubtitle}
            </p>
            <div className="mt-8">
              <a href="#register">
                <Button
                  size="lg"
                  className="bg-white text-navy hover:bg-soft-teal"
                >
                  {t.heroCta}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        id="register"
        className="mx-auto max-w-xl scroll-mt-24 px-4 py-12 sm:px-6"
      >
        <h2 className="mb-2 text-center text-2xl font-bold text-navy">
          التسجيل عند المدخل
        </h2>
        <p className="mb-6 text-center text-sm text-muted">
          أدخل اسمك وسبب الزيارة — تحصل على ترتيبك لليوم فورًا
        </p>
        <PublicRegisterForm />
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Card>
          <h2 className="text-xl font-bold text-navy">من نحن</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-foreground">
            {content.aboutAr}
          </p>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-navy">الخدمات</h2>
            <p className="mt-1 text-sm text-muted">أبرز ما نقدّمه في العيادة</p>
          </div>
          <Link href="/services" className="text-sm font-semibold text-teal">
            الكل
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {content.services.slice(0, 6).map((s) => (
            <Card key={s.name}>
              <h3 className="font-bold text-navy">{s.name}</h3>
              <p className="mt-2 text-sm text-muted">{s.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
