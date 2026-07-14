"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Select, Textarea } from "@/components/ui/Form";

export function AppointmentActions({
  requestId,
  doctors,
  csrfToken,
}: {
  requestId: string;
  doctors: Array<{ id: string; name: string; type: string }>;
  csrfToken: string;
}) {
  const router = useRouter();
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function call(action: string) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/secretary/appointments/${requestId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ action, doctorId, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشلت العملية");
        return;
      }
      setMessage(data.message || "تم بنجاح");
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 space-y-4 rounded-2xl border border-border bg-background p-4">
      <h3 className="font-bold text-navy">توجيه المريض</h3>
      <p className="text-sm text-muted">
        أنت من تختار الطبيب. المريض لا يختار. الدفع يتم بعد الخروج من الطبيب.
      </p>
      <FormField label="توجيه إلى">
        <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
              {d.type === "SPECIALIST"
                ? " — تقويم / جراحة / تركيبات"
                : " — عام / استعجالي"}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="ملاحظة (اختياري)">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button loading={loading} variant="teal" onClick={() => call("direct")}>
          توجيه للطبيب
        </Button>
        <Button loading={loading} variant="danger" onClick={() => call("reject")}>
          رفض
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-success">{message}</p>}
    </div>
  );
}
