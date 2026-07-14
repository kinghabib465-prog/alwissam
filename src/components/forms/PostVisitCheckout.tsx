"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Form";

const coverageOptions = [
  { value: "SESSION_FEE", label: "دفع مبلغ الحصة" },
  { value: "COVERED_SURGERY", label: "تابع لمصاريف العملية" },
  { value: "COVERED_ORTHODONTICS", label: "تابع لمصاريف التقويم" },
  { value: "COVERED_TREATMENT", label: "تابع لخطة العلاج" },
  { value: "COVERED_OTHER", label: "مغطى ضمن تكاليف أخرى" },
] as const;

export function PostVisitCheckout({
  entryId,
  appointmentId,
  patientId,
  doctorType,
  hasPatientAccount,
  csrfToken,
}: {
  entryId: string;
  appointmentId: string;
  patientId: string;
  doctorType: "GENERAL" | "SPECIALIST";
  hasPatientAccount: boolean;
  csrfToken: string;
}) {
  const router = useRouter();
  const [coverage, setCoverage] = useState("SESSION_FEE");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [requestOrthoAccount, setRequestOrthoAccount] = useState(
    doctorType === "SPECIALIST" && !hasPatientAccount,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/secretary/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          entryId,
          appointmentId,
          patientId,
          coverage,
          amount: amount ? Number(amount) : undefined,
          method,
          note,
          requestOrthoAccount:
            doctorType === "SPECIALIST" && !hasPatientAccount
              ? requestOrthoAccount
              : false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشلت العملية");
        return;
      }
      setMessage(data.message || "تم التسجيل");
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 w-full space-y-3 rounded-2xl border border-teal/30 bg-soft-teal/30 p-3">
      <p className="text-sm font-semibold text-navy">
        بعد الخروج من الطبيب — الدفع أو التغطية
      </p>
      <FormField label="الخيار">
        <Select value={coverage} onChange={(e) => setCoverage(e.target.value)}>
          {coverageOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </FormField>
      {coverage === "SESSION_FEE" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <FormField label="المبلغ (د.ج)">
            <Input
              type="number"
              min="1"
              className="font-latin"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </FormField>
          <FormField label="طريقة الدفع">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CASH">نقدًا</option>
              <option value="CARD">بطاقة</option>
              <option value="BANK_TRANSFER">تحويل</option>
              <option value="OTHER">أخرى</option>
            </Select>
          </FormField>
        </div>
      )}
      <FormField label="ملاحظة">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
      </FormField>
      {doctorType === "SPECIALIST" && !hasPatientAccount && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={requestOrthoAccount}
            onChange={(e) => setRequestOrthoAccount(e.target.checked)}
          />
          إنشاء حساب وطلب موافقة بدء التقويم (أول جلسة عند الدكتور منانة فؤاد)
        </label>
      )}
      <Button loading={loading} variant="teal" onClick={submit}>
        تأكيد وإنهاء
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-success">{message}</p>}
    </div>
  );
}
