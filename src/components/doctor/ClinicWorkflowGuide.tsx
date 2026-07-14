"use client";

import { ChevronDown } from "lucide-react";

/** دليل عمل مختصر — منسدل مثل الإعدادات لتقليل التشويش */
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
              السكرتارية تدخل المريض عند وصوله → يظهر في{" "}
              <span className="font-semibold text-navy">الانتظار</span>.
            </li>
            <li>
              من قائمة{" "}
              <span className="font-semibold text-navy">يوم العمل → المعاينة</span>{" "}
              تبدأ الجلسة وتعالج.
            </li>
            <li>
              هذه اللوحة تعرض الجميع حسب الحالة دون تكرار: لم يصل · انتظار ·
              معاينة · انتهى.
            </li>
            <li>
              بعد الجلسة: حجز القادم والحساب من{" "}
              <span className="font-semibold text-navy">مرضاي</span>.
            </li>
          </ol>
        ) : (
          <ul className="list-disc space-y-1.5 pr-5">
            <li>
              هنا <span className="font-semibold text-navy">ملف مرضاك</span> —
              ليس طابور الانتظار.
            </li>
            <li>
              من «إدارة»: جدولة موعد · حساب/QR · تعديل بيانات — تبويب واحد لكل
              مهمة.
            </li>
            <li>
              حالة الوصول اليوم تُدار من{" "}
              <span className="font-semibold text-navy">لوحة اليوم</span> و
              <span className="font-semibold text-navy"> المعاينة</span>.
            </li>
          </ul>
        )}
      </div>
    </details>
  );
}
