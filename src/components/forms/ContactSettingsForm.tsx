"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Form";

/** إعدادات صفحة تواصل معنا + خريطة Google */
export function ContactSettingsForm({
  csrfToken,
  initial,
}: {
  csrfToken: string;
  initial: {
    nameAr: string;
    phone: string;
    email: string;
    address: string;
    mapsEmbedUrl: string;
    mapsLink: string;
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
      body: JSON.stringify({ section: "contact", ...form }),
    });
    setLoading(false);
    setMsg(res.ok ? "تم حفظ التواصل والخريطة" : "فشل الحفظ");
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
      <FormField
        label="رابط Google Maps (فتح الموقع)"
        hint="من مشاركة الموقع في خرائط جوجل — انسخ الرابط"
      >
        <Input
          className="font-latin"
          dir="ltr"
          value={form.mapsLink}
          onChange={(e) => setForm({ ...form, mapsLink: e.target.value })}
          placeholder="https://maps.google.com/..."
        />
      </FormField>
      <FormField
        label="رابط تضمين الخريطة (Embed)"
        hint="في خرائط جوجل: مشاركة → تضمين خريطة → انسخ رابط src داخل iframe"
      >
        <Textarea
          className="font-latin"
          dir="ltr"
          rows={3}
          value={form.mapsEmbedUrl}
          onChange={(e) => setForm({ ...form, mapsEmbedUrl: e.target.value })}
          placeholder="https://www.google.com/maps/embed?..."
        />
      </FormField>
      {form.mapsEmbedUrl && (
        <div className="overflow-hidden rounded-2xl border border-border">
          <iframe
            title="معاينة الخريطة"
            src={form.mapsEmbedUrl}
            className="h-56 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      )}
      <Button type="submit" variant="teal" loading={loading}>
        حفظ التواصل
      </Button>
      {msg && <p className="text-sm text-teal">{msg}</p>}
    </form>
  );
}
