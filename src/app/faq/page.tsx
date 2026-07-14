import { PublicFooter, PublicHeader } from "@/components/public/PublicChrome";
import { Card } from "@/components/ui/Card";
import { loadPublicPagesContent } from "@/lib/public-pages";

export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const content = await loadPublicPagesContent();

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-navy">الأسئلة الشائعة</h1>
        <div className="mt-6 space-y-3">
          {content.faqs.map((item) => (
            <Card key={item.question}>
              <h2 className="font-semibold text-navy">{item.question}</h2>
              <p className="mt-2 text-sm text-muted">{item.answer}</p>
            </Card>
          ))}
          {content.faqs.length === 0 && (
            <Card>
              <p className="text-muted">لا أسئلة بعد — عدّلها من الإعدادات.</p>
            </Card>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
