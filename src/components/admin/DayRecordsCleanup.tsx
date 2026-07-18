"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";

type Preview = {
  date: string;
  counts: {
    registrations: number;
    appointments: number;
    waitingEntries: number;
    invoices: number;
    payments: number;
    treatmentSessions: number;
    orthodonticSessions: number;
  };
  canDelete: boolean;
  blockedReason: string | null;
};

const countLabels: Array<[keyof Preview["counts"], string]> = [
  ["registrations", "تسجيلات المدخل"],
  ["appointments", "المواعيد"],
  ["waitingEntries", "سجلات الانتظار"],
  ["invoices", "الفواتير المحمية"],
  ["payments", "الدفعات المحمية"],
  ["treatmentSessions", "جلسات العلاج المحمية"],
  ["orthodonticSessions", "جلسات التقويم المحمية"],
];

export function DayRecordsCleanup({ csrfToken }: { csrfToken: string }) {
  const [date, setDate] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function inspect() {
    if (!date) return;
    setLoading(true);
    setError("");
    setSuccess("");
    setPreview(null);
    try {
      const res = await fetch("/api/admin/day-records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذر فحص اليوم");
        return;
      }
      setPreview(data);
      setConfirmation("");
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  async function removeDay() {
    if (!preview?.canDelete || confirmation !== preview.date) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/day-records", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ date: preview.date, confirmation }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذر حذف سجل اليوم");
        return;
      }
      setSuccess(data.message || "تم حذف سجل اليوم");
      setPreview(null);
      setConfirmation("");
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
        <h2 className="font-bold text-danger">حذف نهائي لسجل تشغيل يوم</h2>
        <p className="mt-2 text-sm leading-6 text-foreground">
          يحذف تسجيلات المدخل والمواعيد وسجلات الانتظار لليوم المختار. لا
          يحذف ملفات المرضى، ويُمنع تلقائياً إذا وُجدت فاتورة أو دفعة أو جلسة
          علاجية حفاظاً على السجل الطبي والمالي.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <FormField label="اليوم المراد تنظيفه" htmlFor="cleanup-date">
          <Input
            id="cleanup-date"
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setPreview(null);
              setConfirmation("");
            }}
            required
          />
        </FormField>
        <Button
          type="button"
          variant="outline"
          loading={loading}
          disabled={!date}
          onClick={inspect}
        >
          فحص سجل اليوم
        </Button>
      </div>

      {preview && (
        <div className="space-y-4 rounded-2xl border border-border bg-white p-4">
          <h3 className="font-bold text-navy">محتوى يوم {preview.date}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {countLabels.map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-xl bg-background px-3 py-2 text-sm"
              >
                <span>{label}</span>
                <span className="font-latin font-bold">{preview.counts[key]}</span>
              </div>
            ))}
          </div>

          {!preview.canDelete ? (
            <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
              {preview.blockedReason}
            </p>
          ) : (
            <div className="space-y-3 border-t border-border pt-4">
              <FormField
                label={`للتأكيد اكتبي التاريخ: ${preview.date}`}
                htmlFor="cleanup-confirmation"
                hint="الحذف نهائي ولا يمكن التراجع عنه."
              >
                <Input
                  id="cleanup-confirmation"
                  className="font-latin"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder={preview.date}
                  autoComplete="off"
                />
              </FormField>
              <Button
                type="button"
                variant="danger"
                loading={loading}
                disabled={confirmation !== preview.date}
                onClick={removeDay}
              >
                حذف سجل هذا اليوم نهائياً
              </Button>
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {success && <p role="status" className="text-sm font-semibold text-teal">{success}</p>}
    </div>
  );
}
