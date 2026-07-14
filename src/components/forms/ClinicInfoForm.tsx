"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Form";

export function ClinicInfoForm({
  csrfToken,
  initial,
}: {
  csrfToken: string;
  initial: {
    nameAr: string;
    phone: string;
    email: string;
    address: string;
    descriptionAr: string;
  };
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/admin/clinic-settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ section: "clinic_info", ...form }),
    });
    setLoading(false);
    setMsg(res.ok ? "تم الحفظ" : "فشل الحفظ");
    if (res.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <FormField label="اسم العيادة">
        <Input
          value={form.nameAr}
          onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
        />
      </FormField>
      <FormField label="الهاتف">
        <Input
          className="font-latin"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </FormField>
      <FormField label="البريد">
        <Input
          className="font-latin"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </FormField>
      <FormField label="العنوان">
        <Input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </FormField>
      <FormField label="وصف العيادة">
        <Textarea
          rows={4}
          value={form.descriptionAr}
          onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
        />
      </FormField>
      <Button type="submit" loading={loading}>
        حفظ وصف العيادة
      </Button>
      {msg && <p className="text-sm text-teal">{msg}</p>}
    </form>
  );
}
