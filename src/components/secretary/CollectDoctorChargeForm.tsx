"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Select } from "@/components/ui/Form";
import { formatCurrencyDZD } from "@/lib/utils";

export function CollectDoctorChargeForm({
  invoiceId,
  patientName,
  amount,
  csrfToken,
  entryId,
  appointmentId,
}: {
  invoiceId: string;
  patientName: string;
  amount: number;
  csrfToken: string;
  entryId?: string | null;
  appointmentId?: string | null;
}) {
  const router = useRouter();
  const [method, setMethod] = useState("CASH");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function collect() {
    setLoading(true);
    setError("");
    setOk("");
    const res = await fetch("/api/secretary/collect-charge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        invoiceId,
        method,
        entryId: entryId || undefined,
        appointmentId: appointmentId || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل الاستلام");
      return;
    }
    setOk("تم استلام الدفع");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="font-bold text-navy">{patientName}</p>
      <p className="font-latin mt-1 text-lg font-semibold text-teal">
        {formatCurrencyDZD(amount)}
      </p>
      <div className="mt-3">
        <FormField label="طريقة الدفع">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="CASH">نقدًا</option>
            <option value="CARD">بطاقة</option>
            <option value="BANK_TRANSFER">تحويل</option>
            <option value="OTHER">أخرى</option>
          </Select>
        </FormField>
      </div>
      <Button
        className="mt-3 w-full"
        variant="teal"
        loading={loading}
        onClick={collect}
      >
        تأكيد الاستلام
      </Button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {ok && <p className="mt-2 text-sm text-success">{ok}</p>}
    </div>
  );
}
