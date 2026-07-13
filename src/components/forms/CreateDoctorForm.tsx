"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";

export function CreateDoctorForm({ csrfToken }: { csrfToken: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    type: "GENERAL",
    specialtyAr: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/doctors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل الإنشاء");
      return;
    }
    setForm({
      fullName: "",
      email: "",
      phone: "",
      password: "",
      type: "GENERAL",
      specialtyAr: "",
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
      <FormField label="البريد">
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
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
      <FormField label="نوع الطبيب">
        <select
          className="w-full rounded-2xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-teal"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="GENERAL">طبيب عام</option>
          <option value="SPECIALIST">طبيب أخصائي</option>
        </select>
      </FormField>
      <FormField label="التخصص (اختياري)">
        <Input
          value={form.specialtyAr}
          onChange={(e) => setForm({ ...form, specialtyAr: e.target.value })}
          placeholder="مثال: الحالات الاستعجالية"
        />
      </FormField>
      <FormField label="كلمة المرور">
        <Input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          minLength={8}
          required
        />
      </FormField>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">
        إنشاء حساب طبيب
      </Button>
    </form>
  );
}
