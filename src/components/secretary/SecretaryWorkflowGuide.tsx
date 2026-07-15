"use client";

import { ChevronDown } from "lucide-react";

/** مسار العيادة للسكرتارية — من الدخول حتى التوجيه والموعد */
export function SecretaryWorkflowGuide() {
  return (
    <details className="group mb-4 overflow-hidden rounded-2xl border border-border bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold text-navy marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex-1 text-right">مسار العمل في الاستقبال</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted transition group-open:rotate-180" />
      </summary>
      <ol className="list-decimal space-y-2 border-t border-border px-4 py-3 pr-8 text-sm leading-relaxed text-muted">
        <li>
          <span className="font-semibold text-navy">مواعيد اليوم</span> — من حجز
          لهم الطبيب (بدون فتح حساب) ووصل يوم موعدهم: الصباح في الصباح والمساء
          في المساء — وجّهيهم للطبيب من القائمة المنسدلة.
        </li>
        <li>
          <span className="font-semibold text-navy">تسجيل عند المدخل</span> —
          مريض بدون موعد أو تسجيل من الموقع: أكملي البيانات (سكن · مرض · سبب
          الزيارة · أول زيارة).
        </li>
        <li>
          <span className="font-semibold text-navy">توجيه</span> — اختاري الطبيب
          (صباحي/مسائي حسب دوامه) ثم أكّدي؛ يظهر في «الموجهون».
        </li>
        <li>
          بعد المعاينة:{" "}
          <span className="font-semibold text-navy">الدفع</span> إن لزم، والطبيب
          يحجز الموعد القادم من «مرضاي».
        </li>
      </ol>
      <p className="border-t border-border px-4 py-2 text-xs text-muted">
        دوام العيادة: صباح 07:00–14:00 · مساء 16:00–22:00
      </p>
    </details>
  );
}
