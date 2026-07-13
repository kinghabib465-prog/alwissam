"use client";

import { useState } from "react";
import { splitPatientName } from "@/lib/patient-name";
import { toLatinDigits } from "@/lib/latin-digits";

/** صف مريض للسكرتير: اضغط الاسم → معلومات منسدلة (بدون أيقونة) */
export function SecretaryPatientInfo({
  fullName,
  phone,
  age,
  city,
  queueOrder,
  children,
}: {
  fullName: string;
  phone?: string | null;
  age?: number | null;
  city?: string | null;
  queueOrder?: number;
  /** أزرار الإجراءات بجانب الاسم */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { firstName, lastName } = splitPatientName(fullName);
  const phoneLabel =
    phone && phone !== "غير محدد" && !String(phone).startsWith("بدون-")
      ? toLatinDigits(phone)
      : "—";

  return (
    <div className="rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-right"
          onClick={() => setOpen((v) => !v)}
        >
          {queueOrder != null && (
            <span className="font-latin flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-soft-teal text-lg font-bold text-teal">
              {toLatinDigits(queueOrder)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-navy">
              {firstName || "—"}
              {lastName ? (
                <span className="mr-2 font-semibold text-teal">{lastName}</span>
              ) : null}
            </p>
            <p className="text-xs text-muted">
              {open ? "إخفاء المعلومات" : "اضغط لعرض المعلومات"}
            </p>
          </div>
        </button>
        {children ? (
          <div className="flex flex-wrap gap-2">{children}</div>
        ) : null}
      </div>

      {open && (
        <div className="mt-3 space-y-1.5 rounded-2xl bg-[#F8FBFC] px-3 py-3 text-sm">
          <p>
            <span className="text-muted">الاسم: </span>
            <span className="font-bold text-navy">{firstName || "—"}</span>
          </p>
          <p>
            <span className="text-muted">اللقب: </span>
            <span className="font-semibold text-teal">{lastName || "—"}</span>
          </p>
          <p>
            <span className="text-muted">العمر: </span>
            <span className="font-latin font-semibold">
              {age != null ? toLatinDigits(age) : "—"}
            </span>
          </p>
          <p>
            <span className="text-muted">رقم الهاتف: </span>
            <span className="font-latin font-semibold" data-numeric="true">
              {phoneLabel}
            </span>
          </p>
          <p>
            <span className="text-muted">المدينة: </span>
            <span className="font-semibold">{city?.trim() || "—"}</span>
          </p>
        </div>
      )}
    </div>
  );
}
