"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Form";
import { toGoogleMapsEmbedUrl, toGoogleMapsOpenUrl } from "@/lib/maps-url";

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
  const [err, setErr] = useState("");

  const previewEmbed = useMemo(
    () => toGoogleMapsEmbedUrl(form.mapsEmbedUrl || form.mapsLink),
    [form.mapsEmbedUrl, form.mapsLink],
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setErr("");
    const res = await fetch("/api/admin/clinic-settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ section: "contact", ...form }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error || "فشل الحفظ");
      return;
    }
    setMsg("تم حفظ التواصل والخريطة");
    router.refresh();
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
        label="رابط الموقع على Google Maps"
        hint="الصق أي رابط من خرائط جوجل (مشاركة / فتح في الخرائط) أو كود iframe كاملاً — يُحوَّل تلقائياً للعرض"
      >
        <Textarea
          className="font-latin"
          dir="ltr"
          rows={3}
          value={form.mapsEmbedUrl || form.mapsLink}
          onChange={(e) => {
            const value = e.target.value;
            setForm({
              ...form,
              mapsEmbedUrl: value,
              mapsLink: toGoogleMapsOpenUrl(value) || form.mapsLink,
            });
          }}
          placeholder="https://maps.app.goo.gl/... أو https://www.google.com/maps/embed?..."
        />
      </FormField>
      {previewEmbed ? (
        <div className="overflow-hidden rounded-2xl border border-border">
          <iframe
            title="معاينة الخريطة"
            src={previewEmbed}
            className="h-56 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      ) : (
        <p className="text-sm text-muted">أضف رابط الخريطة لمعاينة المكان هنا</p>
      )}
      <Button type="submit" variant="teal" loading={loading}>
        حفظ التواصل
      </Button>
      {msg && <p className="text-sm text-teal">{msg}</p>}
      {err && <p className="text-sm text-danger">{err}</p>}
    </form>
  );
}
