"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Form";
import { appointmentTypeAr } from "@/i18n/ar";

const visitReasons = [
  { value: "EMERGENCY", label: "حالة استعجالية (أورجونص)" },
  { value: "TOOTHACHE", label: "ألم أسنان" },
  { value: "GENERAL_EXAM", label: "فحص عام" },
  { value: "CLEANING", label: "تنظيف" },
  { value: "FILLING", label: "حشو" },
  { value: "EXTRACTION", label: "نزع سن" },
  { value: "ROOT_CANAL", label: "علاج عصب" },
  { value: "ORTHO_CONSULT", label: "استشارة تقويم" },
  { value: "ORTHO_FOLLOWUP", label: "متابعة تقويم" },
  { value: "PROSTHETICS", label: "تركيب أسنان" },
  { value: "SURGERY_CONSULT", label: "استشارة جراحية" },
  { value: "SURGERY", label: "عملية" },
  { value: "POST_OP_FOLLOWUP", label: "متابعة بعد العملية" },
  { value: "OTHER", label: "أخرى" },
] as const;

/** نموذج التسجيل عند المدخل — يُستخدم في الرئيسية */
export function PublicRegisterForm() {
  const reasons = useMemo(() => visitReasons, []);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{
    message: string;
    requestNumber: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    appointmentType: "GENERAL_EXAM",
    consentAccepted: false,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(null);
    try {
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
      const reasonLabel =
        reasons.find((r) => r.value === form.appointmentType)?.label ||
        appointmentTypeAr[form.appointmentType] ||
        "تسجيل عند المدخل";
      const res = await fetch("/api/public/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone: form.phone.trim(),
          appointmentType: form.appointmentType,
          isEmergency: form.appointmentType === "EMERGENCY",
          reason: reasonLabel,
          consentAccepted: form.consentAccepted,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذر التسجيل");
        return;
      }
      setSuccess({
        message: "تم تسجيلك",
        requestNumber: String(data.queueNumber || data.requestNumber || ""),
      });
      setForm({
        firstName: "",
        lastName: "",
        phone: "",
        appointmentType: "GENERAL_EXAM",
        consentAccepted: false,
      });
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div
        role="status"
        className="rounded-2xl border-2 border-teal bg-soft-teal px-5 py-6 text-center shadow-sm"
      >
        <p className="text-2xl font-bold text-teal">{success.message}</p>
        {success.requestNumber && (
          <p
            className="font-latin mt-2 text-3xl font-bold text-navy"
            data-numeric="true"
          >
            {success.requestNumber}
          </p>
        )}
            <p className="mt-1 text-sm text-navy/80">ترتيبك اليوم</p>
        <p className="mt-3 text-sm text-navy/80">
          انتظر عند المدخل — السكرتارية ستوجّهك.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => setSuccess(null)}>
          تسجيل مريض آخر
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="card-surface space-y-4 border-t-4 border-t-teal p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="الاسم" htmlFor="firstName">
          <Input
            id="firstName"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
          />
        </FormField>
        <FormField label="اللقب" htmlFor="lastName">
          <Input
            id="lastName"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
          />
        </FormField>
      </div>

      <FormField label="الهاتف" htmlFor="phone" hint="مطلوب — للتواصل والتوجيه">
        <Input
          id="phone"
          className="font-latin"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="0555..."
          required
          minLength={8}
        />
      </FormField>

      <FormField label="سبب الزيارة / حالة المريض" htmlFor="visitReason">
        <Select
          id="visitReason"
          value={form.appointmentType}
          onChange={(e) =>
            setForm({ ...form, appointmentType: e.target.value })
          }
          required
        >
          {reasons.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </FormField>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={form.consentAccepted}
          onChange={(e) =>
            setForm({ ...form, consentAccepted: e.target.checked })
          }
          required
        />
        أوافق على تسجيل بياناتي في العيادة.
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" loading={loading} className="w-full" size="lg">
        تسجيل
      </Button>
    </form>
  );
}
