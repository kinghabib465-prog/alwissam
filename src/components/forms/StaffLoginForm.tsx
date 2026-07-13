"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";

export function StaffLoginForm({
  csrfToken,
  initialEmail,
  initialPhone,
}: {
  csrfToken: string;
  initialEmail: string;
  initialPhone: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({
    email: initialEmail,
    phone: initialPhone,
    currentPassword: "",
    newPassword: "",
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOk("");
    const res = await fetch("/api/staff/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل الحفظ");
      return;
    }
    setOk("تم تحديث بيانات الدخول");
    setForm((f) => ({ ...f, currentPassword: "", newPassword: "" }));
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <FormField label="البريد (اليوزر)">
        <Input
          type="email"
          className="font-latin"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </FormField>
      <FormField label="الهاتف (يمكن استخدامه للدخول)">
        <Input
          className="font-latin"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </FormField>
      <FormField label="كلمة السر الحالية (عند التغيير فقط)">
        <Input
          type="password"
          value={form.currentPassword}
          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
        />
      </FormField>
      <FormField label="كلمة السر الجديدة">
        <Input
          type="password"
          minLength={8}
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
        />
      </FormField>
      {error && <p className="text-sm text-danger">{error}</p>}
      {ok && <p className="text-sm text-success">{ok}</p>}
      <Button type="submit" loading={loading} className="w-full">
        حفظ بيانات الدخول
      </Button>
    </form>
  );
}
