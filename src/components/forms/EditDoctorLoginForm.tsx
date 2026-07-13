"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";

export function EditDoctorLoginForm({
  userId,
  initialEmail,
  initialPhone,
  csrfToken,
}: {
  userId: string;
  initialEmail: string;
  initialPhone: string;
  csrfToken: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    email: initialEmail,
    phone: initialPhone,
    newPassword: "",
  });

  async function save() {
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/admin/doctors", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ userId, ...form }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "فشل");
      return;
    }
    setMsg("تم تحديث الدخول");
    setForm((f) => ({ ...f, newPassword: "" }));
    router.refresh();
  }

  return (
    <div>
      <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
        تعديل الدخول
      </Button>
      {open && (
        <div className="mt-3 space-y-2 rounded-xl border border-border p-3">
          <FormField label="البريد (اليوزر)">
            <Input
              className="font-latin"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </FormField>
          <FormField label="الهاتف">
            <Input
              className="font-latin"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </FormField>
          <FormField label="كلمة سر جديدة (اختياري)">
            <Input
              type="password"
              minLength={8}
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            />
          </FormField>
          <Button size="sm" variant="teal" loading={loading} onClick={save}>
            حفظ
          </Button>
          {msg && <p className="text-xs text-teal">{msg}</p>}
        </div>
      )}
    </div>
  );
}
