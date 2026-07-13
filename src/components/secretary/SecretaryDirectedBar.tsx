"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Card";
import { waitingRoomStatusAr } from "@/i18n/ar";
import { SecretaryPatientInfo } from "@/components/secretary/SecretaryPatientInfo";

export function SecretaryDirectedBar({
  entryId,
  fullName,
  phone,
  age,
  city,
  status,
  unpaidInvoiceId,
  amountLabel,
  csrfToken,
  queueOrder,
}: {
  entryId: string;
  patientId: string;
  fullName: string;
  phone?: string | null;
  age?: number | null;
  city?: string | null;
  doctorName: string;
  status: string;
  unpaidInvoiceId?: string | null;
  amountLabel?: string | null;
  csrfToken: string;
  queueOrder?: number;
  hideDoctor?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canRemove = status === "WAITING" || status === "ARRIVED";

  async function remove() {
    if (!confirm("حذف المريض من الانتظار؟ (لم يدخل عند الطبيب)")) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/secretary/waiting-room/${entryId}`, {
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
        <StatusBadge
          label={
            waitingRoomStatusAr[status as keyof typeof waitingRoomStatusAr] ||
            status
          }
          tone={status === "SESSION_DONE" ? "warning" : "teal"}
        />
        {amountLabel && (
          <span className="rounded-2xl bg-[#E8F3F8] px-2.5 py-1 text-xs font-semibold text-blue">
            {amountLabel}
          </span>
        )}
        {unpaidInvoiceId ? (
          <Link href={`/secretary/payments?invoice=${unpaidInvoiceId}`}>
            <Button size="sm" variant="secondary">
              دفع
            </Button>
          </Link>
        ) : null}
        {canRemove && (
          <Button
            size="sm"
            variant="danger"
            loading={loading}
            onClick={remove}
          >
            حذف
          </Button>
        )}
      </SecretaryPatientInfo>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
