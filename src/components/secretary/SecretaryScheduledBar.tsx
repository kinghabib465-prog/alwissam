"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Form";
import { SecretaryPatientInfo } from "@/components/secretary/SecretaryPatientInfo";
import { formatTime } from "@/lib/utils";
import { toLatinDigits } from "@/lib/latin-digits";

type DoctorOpt = { id: string; name: string; type: string };

export function SecretaryScheduledBar({
  appointmentId,
  fullName,
  phone,
  age,
  city,
  doctorId,
  startAtIso,
  appointmentTypeLabel,
  queueOrder,
  doctors,
  csrfToken,
}: {
  appointmentId: string;
  fullName: string;
  phone: string;
  age?: number | null;
  city?: string | null;
  doctorId: string;
  doctorName: string;
  startAtIso: string;
  appointmentTypeLabel: string;
  queueOrder: number;
  doctors: DoctorOpt[];
  csrfToken: string;
}) {
  const router = useRouter();
  const [selectedDoctor, setSelectedDoctor] = useState(doctorId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkIn() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/secretary/scheduled-check-in", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        appointmentId,
        doctorId: selectedDoctor,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل الإدخال");
      return;
    }
    router.push("/secretary/directed");
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
        <span className="rounded-2xl bg-soft-teal px-2.5 py-1 text-xs font-semibold text-teal">
          موعد {toLatinDigits(formatTime(startAtIso))} · {appointmentTypeLabel}
        </span>
      </SecretaryPatientInfo>

      <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-teal/30 bg-soft-teal/15 p-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <p className="mb-1 text-xs text-muted">الطبيب</p>
          <Select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.type === "SPECIALIST" ? " — أخصائي" : " — عام"}
              </option>
            ))}
          </Select>
        </div>
        <Button size="sm" variant="teal" loading={loading} onClick={checkIn}>
          إدخال للطبيب
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
