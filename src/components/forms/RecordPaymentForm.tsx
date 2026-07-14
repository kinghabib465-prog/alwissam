"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Form";

export function RecordPaymentForm({
  csrfToken,
  invoices,
}: {
  csrfToken: string;
  invoices: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [invoiceId, setInvoiceId] = useState(invoices[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/secretary/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        invoiceId,
        amount: Number(amount),
        method,
        notes,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل التسجيل");
      return;
    }
    setAmount("");
    setNotes("");
    router.refresh();
  }

  if (invoices.length === 0) {
    return (
      <p className="text-sm text-muted">
        لا توجد فواتير مستحقة. أنشئ فاتورة من سجل المريض أولاً.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <FormField label="الفاتورة">
        <Select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
          {invoices.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.label}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="المبلغ">
        <Input
          type="number"
          className="font-latin"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          min="1"
        />
      </FormField>
      <FormField label="طريقة الدفع">
        <Select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="CASH">نقدًا</option>
          <option value="CARD">بطاقة</option>
          <option value="BANK_TRANSFER">تحويل بنكي</option>
          <option value="OTHER">أخرى</option>
        </Select>
      </FormField>
      <FormField label="ملاحظات">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormField>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">
        تسجيل الدفعة
      </Button>
    </form>
  );
}
