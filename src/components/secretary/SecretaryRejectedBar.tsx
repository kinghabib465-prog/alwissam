"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { splitPatientName } from "@/lib/patient-name";
import { toLatinDigits } from "@/lib/latin-digits";
import { formatClinicDate } from "@/lib/clinic-date";

export type RejectedEntry = {
  id: string;
  fullName: string;
  phone: string;
  doctorName: string;
  privateReason: string;
  publicReason: string;
  rejectedAtIso: string;
};

/** مرفوض من الطبيب — سبب سري للسكرتيرة + ما يُقال للمريض */
export function SecretaryRejectedBar({
  entry,
  csrfToken,
}: {
  entry: RejectedEntry;
  csrfToken: string;
}) {
  const router = useRouter();
  const { firstName, lastName } = splitPatientName(entry.fullName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function dismiss() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/secretary/waiting-room/${entry.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ action: "dismiss_rejected" }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "تعذر الإغلاق");
      return;
    }
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-danger/25 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-navy">
            {firstName}
            {lastName ? (
              <span className="mr-2 font-semibold text-teal">{lastName}</span>
            ) : null}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {entry.doctorName} · {formatClinicDate(entry.rejectedAtIso)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-danger/10 px-2.5 py-1 text-xs font-bold text-danger">
          مرفوض
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-border bg-[#FFF8F8] px-4 py-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-danger">سبب الطبيب (سري)</p>
            <p className="mt-1 font-semibold text-navy">{entry.privateReason}</p>
          </div>

          {entry.publicReason ? (
            <div className="rounded-xl border border-teal/20 bg-teal/5 px-3 py-2">
              <p className="text-xs font-semibold text-teal">
                ما يُقال للمريض (لباقة)
              </p>
              <p className="mt-1 text-navy">{entry.publicReason}</p>
            </div>
          ) : (
            <p className="text-xs text-muted">
              لم يُحدّد نص لطيف — استخدمي لباقة عامة عند التحدث مع المريض.
            </p>
          )}

          <p className="text-xs text-muted">
            الهاتف:{" "}
            <span className="font-latin font-semibold">
              {toLatinDigits(entry.phone || "—")}
            </span>
          </p>

          {error && <p className="text-xs text-danger">{error}</p>}

          <Button
            size="sm"
            variant="outline"
            loading={loading}
            onClick={dismiss}
          >
            تم التعامل مع المريض
          </Button>
        </div>
      )}
    </div>
  );
}
