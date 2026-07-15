"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Form";
import {
  VISIT_REASONS,
  isOtherVisitReason,
  resolveVisitReason,
} from "@/lib/visit-reasons";

/** تسجيل عند المدخل — مع سبب الزيارة */
export function SecretaryWalkInForm({ csrfToken }: { csrfToken: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    age: "",
    city: "",
    chronicIllnesses: "",
    appointmentType: "GENERAL_EXAM",
    customReason: "",
    isFirstVisit: true,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isOtherVisitReason(form.appointmentType) && !form.customReason.trim()) {
      setError("اكتب سبب الزيارة عند اختيار «أخرى»");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/secretary/walk-in", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        fullName: form.fullName,
        phone: form.phone,
        age: form.age ? Number(form.age) : undefined,
        city: form.city || undefined,
        chronicIllnesses: form.chronicIllnesses || undefined,
        appointmentType: form.appointmentType,
        reason: resolveVisitReason(form.appointmentType, form.customReason),
        isEmergency: form.appointmentType === "EMERGENCY",
        isFirstVisit: form.isFirstVisit,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل التسجيل");
      return;
    }
    setForm({
      fullName: "",
      phone: "",
      age: "",
      city: "",
      chronicIllnesses: "",
      appointmentType: "GENERAL_EXAM",
      customReason: "",
      isFirstVisit: true,
    });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button
        size="lg"
        className="mb-4 w-full sm:w-auto"
        variant="teal"
        onClick={() => setOpen(true)}
      >
        + تسجيل عند الوصول
      </Button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="card-surface mb-4 space-y-3 border-teal/30 p-4"
    >
      <FormField label="الاسم واللقب">
        <Input
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          required
        />
      </FormField>
      <FormField label="رقم الهاتف">
        <Input
          className="font-latin"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
          minLength={8}
        />
      </FormField>
      <FormField label="سبب الزيارة">
        <Select
          value={form.appointmentType}
          onChange={(e) =>
            setForm({
              ...form,
              appointmentType: e.target.value,
              customReason:
                e.target.value === "OTHER" ? form.customReason : "",
            })
          }
          required
        >
          {VISIT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </FormField>
      {isOtherVisitReason(form.appointmentType) && (
        <FormField label="اكتب سبب الزيارة">
          <Input
            value={form.customReason}
            onChange={(e) =>
              setForm({ ...form, customReason: e.target.value })
            }
            placeholder="مثال: ألم في اللثة، كسر في السن..."
            required
            minLength={2}
          />
        </FormField>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="العمر">
          <Input
            className="font-latin"
            type="number"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
          />
        </FormField>
        <FormField label="السكن">
          <Input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="المدينة / البلدية"
          />
        </FormField>
      </div>
      <FormField label="مرض تعاني منه">
        <Input
          value={form.chronicIllnesses}
          onChange={(e) =>
            setForm({ ...form, chronicIllnesses: e.target.value })
          }
          placeholder="مثال: سكري، ضغط… أو لا يوجد"
        />
      </FormField>
      <label className="flex items-center gap-2 text-sm font-semibold text-navy">
        <input
          type="checkbox"
          checked={form.isFirstVisit}
          onChange={(e) =>
            setForm({ ...form, isFirstVisit: e.target.checked })
          }
        />
        أول زيارة للعيادة
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={loading} variant="teal">
          إضافة للقائمة
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}
