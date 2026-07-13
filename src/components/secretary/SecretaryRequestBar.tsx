"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Form";
import { SecretaryPatientInfo } from "@/components/secretary/SecretaryPatientInfo";

type DoctorOpt = { id: string; name: string; type: string };

export function SecretaryRequestBar({
  requestId,
  fullName,
  phone,
  age,
  city,
  queueOrder,
  doctors,
  csrfToken,
  unpaidInvoiceId,
}: {
  requestId: string;
  fullName: string;
  phone: string;
  age?: number | null;
  city?: string | null;
  queueOrder: number;
  doctors: DoctorOpt[];
  csrfToken: string;
  unpaidInvoiceId?: string | null;
}) {
  const router = useRouter();
  const [openDirect, setOpenDirect] = useState(false);
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function direct() {
    if (!doctorId) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/secretary/appointments/${requestId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ action: "direct", doctorId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل التوجيه");
      return;
    }
    setOpenDirect(false);
    router.push("/secretary/directed");
    router.refresh();
  }

  async function remove() {
    if (!confirm("حذف هذا المريض من الاستقبال؟ (لم يدخل الطبيب)")) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/secretary/appointments/${requestId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ action: "remove" }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل الحذف");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <SecretaryPatientInfo
        fullName={fullName}
        phone={phone}
        age={age}
        city={city}
        queueOrder={queueOrder}
      >
        <Button
          size="sm"
          className="bg-teal hover:bg-[#0c8282]"
          onClick={() => setOpenDirect((v) => !v)}
        >
          توجيه
        </Button>
        <Link
          href={
            unpaidInvoiceId
              ? `/secretary/payments?invoice=${unpaidInvoiceId}`
              : "/secretary/payments"
          }
        >
          <Button size="sm" className="bg-blue hover:bg-[#145a72]">
            دفع
          </Button>
        </Link>
        <Button size="sm" variant="danger" loading={loading} onClick={remove}>
          حذف
        </Button>
      </SecretaryPatientInfo>

      {openDirect && (
        <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-border bg-white p-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <p className="mb-1 text-xs text-muted">اختر الطبيب</p>
            <Select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.type === "SPECIALIST" ? " — أخصائي" : " — عام"}
                </option>
              ))}
            </Select>
          </div>
          <Button size="sm" variant="teal" loading={loading} onClick={direct}>
            تأكيد التوجيه
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
