"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Form";

export function CreatePatientForm({ csrfToken }: { csrfToken: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    age: "",
    gender: "",
    city: "",
    notes: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/secretary/patients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        ...form,
        age: form.age ? Number(form.age) : undefined,
        gender: form.gender || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل التسجيل");
      return;
    }
    setForm({
      fullName: "",
      phone: "",
      email: "",
      age: "",
      gender: "",
      city: "",
      notes: "",
    });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <FormField label="الاسم الكامل">
        <Input
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          required
        />
      </FormField>
      <FormField label="الهاتف">
        <Input
          className="font-latin"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
        />
      </FormField>
      <FormField label="البريد">
        <Input
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </FormField>
      <FormField label="العمر">
        <Input
          type="number"
          className="font-latin"
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
        />
      </FormField>
      <FormField label="الجنس">
        <Select
          value={form.gender}
          onChange={(e) => setForm({ ...form, gender: e.target.value })}
        >
          <option value="">—</option>
          <option value="MALE">ذكر</option>
          <option value="FEMALE">أنثى</option>
        </Select>
      </FormField>
      <FormField label="المدينة">
        <Input
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />
      </FormField>
      <FormField label="ملاحظات">
        <Textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </FormField>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">
        حفظ المريض
      </Button>
    </form>
  );
}
