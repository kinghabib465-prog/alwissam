import { PublicFooter, PublicHeader } from "@/components/public/PublicChrome";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function SurgeryPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-navy">الجراحة</h1>
        <Card className="mt-6 space-y-3">
          <p>خدمات جراحية واستشارات ومتابعة ما بعد العملية بإشراف الدكتور منانة فؤاد.</p>
          <ul className="list-disc pr-5 text-sm text-muted">
            <li>استشارة جراحية وتقييم الحالة</li>
            <li>عمليات مفردة أو متعددة المراحل</li>
            <li>تعليمات قبل وبعد العملية</li>
            <li>مواعيد متابعة مجدولة</li>
          </ul>
          <Link href="/register"><Button>سجّل لاستشارة جراحية</Button></Link>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
