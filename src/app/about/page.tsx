import { PublicFooter, PublicHeader } from "@/components/public/PublicChrome";
import { Card } from "@/components/ui/Card";
import { loadPublicPagesContent } from "@/lib/public-pages";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const content = await loadPublicPagesContent();

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-navy">من نحن</h1>
        <Card className="mt-6">
          <p className="whitespace-pre-line leading-7">{content.aboutAr}</p>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
