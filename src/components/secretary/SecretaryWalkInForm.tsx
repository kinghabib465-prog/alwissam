"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";

/** تسجيل عند المدخل — الاسم · الهاتف · العمر · المدينة */
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
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل التسجيل");
      return;
    }
    setForm({ fullName: "", phone: "", age: "", city: "" });
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
      <Input
        value={form.fullName}
        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        placeholder="الاسم واللقب"
        required
      />
      <Input
        className="font-latin"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        placeholder="رقم الهاتف"
        required
        minLength={8}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          className="font-latin"
          type="number"
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
          placeholder="العمر"
        />
        <Input
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          placeholder="المدينة"
        />
      </div>
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
