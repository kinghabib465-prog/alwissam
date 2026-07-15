"use client";

import { ChevronDown } from "lucide-react";

/** مسار العيادة للسكرتارية — تتبّع يوم واحد منطقي */
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
          لهم الطبيب ووصل يومهم: وجّهي للطبيب. الصباح صباحاً · مساءً يظهر
          المسائي + أي صباحي لم يأتِ بعد.
        </li>
        <li>
          <span className="font-semibold text-navy">تسجيل عند المدخل</span> —
          بدون موعد / من الموقع → أكملي البيانات ثم وجّهي.
        </li>
        <li>
          <span className="font-semibold text-navy">الموجهون</span> — انتظار →
          عند الطبيب → بعد المعاينة: ادفعِ أو أغلقي الزيارة. قائمة اليوم فقط.
        </li>
        <li>
          الطبيب يحجز القادم من مرضاي بدون فتح حساب — يظهر هنا يوم الموعد.
        </li>
      </ol>
      <p className="border-t border-border px-4 py-2 text-xs text-muted">
        دوام العيادة: صباح 07:00–14:00 · مساء 16:00–22:00
      </p>
    </details>
  );
}
