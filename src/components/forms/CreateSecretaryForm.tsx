"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Form";

export function CreateSecretaryForm({ csrfToken }: { csrfToken: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    shiftCode: "MORNING",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/secretaries", {
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
      shiftCode: "MORNING",
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
          className="font-latin"
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
      <FormField label="وردية فتح الحساب">
        <Select
          value={form.shiftCode}
          onChange={(e) => setForm({ ...form, shiftCode: e.target.value })}
        >
          <option value="MORNING">صباحي 07:00–14:30</option>
          <option value="EVENING">مسائي 16:00–22:00</option>
        </Select>
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
        إنشاء حساب سكرتير
      </Button>
    </form>
  );
}
