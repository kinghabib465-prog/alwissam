import { PublicFooter, PublicHeader } from "@/components/public/PublicChrome";
import { Card } from "@/components/ui/Card";
import { loadPublicPagesContent } from "@/lib/public-pages";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const content = await loadPublicPagesContent();

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-navy">الخدمات</h1>
        <p className="mt-2 text-muted">خدمات عيادة الوسام لطب الأسنان</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {content.services.map((service) => (
            <Card key={service.name}>
              <h2 className="font-bold text-navy">{service.name}</h2>
              <p className="mt-2 text-sm text-muted">{service.description}</p>
            </Card>
          ))}
          {content.services.length === 0 && (
            <Card>
              <p className="text-muted">لا خدمات معروضة بعد — عدّلها من الإعدادات.</p>
            </Card>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
