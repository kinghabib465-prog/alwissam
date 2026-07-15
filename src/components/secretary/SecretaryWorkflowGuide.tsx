"use client";

import { ChevronDown } from "lucide-react";

/** دليل مختصر — الاستقبال صار شاشة واحدة */
export function SecretaryWorkflowGuide() {
  return (
    <details className="group mb-4 overflow-hidden rounded-2xl border border-border bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold text-navy marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex-1 text-right">كيف يعمل الاستقبال؟</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted transition group-open:rotate-180" />
      </summary>
      <ol className="list-decimal space-y-1.5 border-t border-border px-4 py-3 pr-8 text-sm leading-relaxed text-muted">
        <li>
          <span className="font-semibold text-navy">مواعيد اليوم</span> — من
          حجز لهم الطبيب: صباح أو مساء حسب الوقت.
        </li>
        <li>
          <span className="font-semibold text-navy">المدخل</span> — مريض جديد /
          من الموقع ثم توجيه.
        </li>
        <li>
          <span className="font-semibold text-navy">الانتظار</span> — راقبي من
          عند كل طبيب.
        </li>
        <li>
          <span className="font-semibold text-navy">الدفع</span> — بعد انتهاء
          المعاينة.
        </li>
      </ol>
    </details>
  );
}
