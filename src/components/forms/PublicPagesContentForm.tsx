"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Form";

type FaqItem = { question: string; answer: string };
type ServiceItem = { name: string; description: string };

export function PublicPagesContentForm({
  csrfToken,
  initialAbout,
  initialServices,
  initialFaqs,
}: {
  csrfToken: string;
  initialAbout: string;
  initialServices: ServiceItem[];
  initialFaqs: FaqItem[];
}) {
  const router = useRouter();
  const [about, setAbout] = useState(initialAbout);
  const [services, setServices] = useState<ServiceItem[]>(
    initialServices.length
      ? initialServices
      : [{ name: "", description: "" }],
  );
  const [faqs, setFaqs] = useState<FaqItem[]>(
    initialFaqs.length ? initialFaqs : [{ question: "", answer: "" }],
  );
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/admin/clinic-settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        section: "public_pages",
        aboutAr: about,
        services: services.filter((s) => s.name.trim()),
        faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
      }),
    });
    setLoading(false);
    setMsg(res.ok ? "تم حفظ صفحات الموقع" : "فشل الحفظ");
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 font-semibold text-navy">من نحن</h3>
        <FormField label="نص صفحة من نحن">
          <Textarea
            rows={5}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="تعريف العيادة..."
          />
        </FormField>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-navy">الخدمات</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setServices((s) => [...s, { name: "", description: "" }])
            }
          >
            إضافة خدمة
          </Button>
        </div>
        <div className="space-y-3">
          {services.map((item, i) => (
            <div
              key={i}
              className="space-y-2 rounded-xl border border-border p-3"
            >
              <FormField label="اسم الخدمة">
                <Input
                  value={item.name}
                  onChange={(e) => {
                    const next = [...services];
                    next[i] = { ...item, name: e.target.value };
                    setServices(next);
                  }}
                />
              </FormField>
              <FormField label="الوصف">
                <Textarea
                  rows={2}
                  value={item.description}
                  onChange={(e) => {
                    const next = [...services];
                    next[i] = { ...item, description: e.target.value };
                    setServices(next);
                  }}
                />
              </FormField>
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() =>
                  setServices((s) => s.filter((_, idx) => idx !== i))
                }
              >
                حذف
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-navy">الأسئلة الشائعة</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setFaqs((f) => [...f, { question: "", answer: "" }])
            }
          >
            إضافة سؤال
          </Button>
        </div>
        <div className="space-y-3">
          {faqs.map((item, i) => (
            <div
              key={i}
              className="space-y-2 rounded-xl border border-border p-3"
            >
              <FormField label="السؤال">
                <Input
                  value={item.question}
                  onChange={(e) => {
                    const next = [...faqs];
                    next[i] = { ...item, question: e.target.value };
                    setFaqs(next);
                  }}
                />
              </FormField>
              <FormField label="الجواب">
                <Textarea
                  rows={2}
                  value={item.answer}
                  onChange={(e) => {
                    const next = [...faqs];
                    next[i] = { ...item, answer: e.target.value };
                    setFaqs(next);
                  }}
                />
              </FormField>
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() => setFaqs((f) => f.filter((_, idx) => idx !== i))}
              >
                حذف
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Button type="button" variant="teal" loading={loading} onClick={save}>
        حفظ من نحن · الخدمات · الأسئلة
      </Button>
      {msg && <p className="text-sm text-teal">{msg}</p>}
    </div>
  );
}
