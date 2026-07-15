"use client";

import { ChevronDown } from "lucide-react";

/** دليل عمل الطبيب — من الاستقبال حتى الموعد القادم */
export function ClinicWorkflowGuide({
  variant,
}: {
  variant: "today" | "patients";
}) {
  const title =
    variant === "today"
      ? "مسار يوم العمل في العيادة"
      : "متى تستخدم «مرضاي»؟";

  return (
    <details className="group mb-4 overflow-hidden rounded-2xl border border-border bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold text-navy marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex-1 text-right">{title}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted transition group-open:rotate-180" />
      </summary>
      <div className="space-y-2 border-t border-border px-4 py-3 text-sm leading-relaxed text-muted">
        {variant === "today" ? (
          <ol className="list-decimal space-y-1.5 pr-5">
            <li>
              السكرتارية تدخل المريض عند وصوله →{" "}
              <span className="font-semibold text-navy">الانتظار</span>.
            </li>
            <li>
              من{" "}
              <span className="font-semibold text-navy">يوم العمل → المعاينة</span>{" "}
              تبدئين الجلسة.
            </li>
            <li>
              هذه اللوحة: لم يصل · انتظار · معاينة · انتهى — حسب حالة اليوم.
            </li>
            <li>
              بعد الجلسة: حجز القادم (يوم +{" "}
              <span className="font-semibold text-navy">صباح/مساء</span>) من{" "}
              <span className="font-semibold text-navy">مرضاي</span>.
            </li>
          </ol>
        ) : (
          <ul className="list-disc space-y-1.5 pr-5">
            <li>
              ملف مرضاك: حجز موعد{" "}
              <span className="font-semibold text-navy">يوم + صباح أو مساء</span>{" "}
              · حساب/QR · بيانات.
            </li>
            <li>
              الموعد يظهر للسكرتارية تلقائياً{" "}
              <span className="font-semibold text-navy">في يومه</span> فقط.
            </li>
            <li>
              دوام العيادة الافتراضي: صباح 07:00–14:00 · مساء 16:00–22:00 (يُضبط
              لكل طبيب من الإعدادات).
            </li>
          </ul>
        )}
      </div>
    </details>
  );
}
