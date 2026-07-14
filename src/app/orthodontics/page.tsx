import { PublicFooter, PublicHeader } from "@/components/public/PublicChrome";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function OrthodonticsPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-navy">التقويم</h1>
        <Card className="mt-6 space-y-3">
          <p>متابعة تقويم الأسنان لدى الدكتور منانة فؤاد مع خطط متعددة الحصص وجلسات دورية.</p>
          <ul className="list-disc pr-5 text-sm text-muted">
            <li>استشارة تقويم وتشخيص</li>
            <li>متابعة دورية أسبوعية أو نصف شهرية</li>
            <li>صور قبل وبعد وملفات الأشعة</li>
            <li>مرحلة المثبت بعد انتهاء العلاج</li>
          </ul>
          <Link href="/register"><Button>سجّل لاستشارة تقويم</Button></Link>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
