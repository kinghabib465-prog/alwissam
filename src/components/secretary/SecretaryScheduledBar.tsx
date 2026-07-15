"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Form";
import { SecretaryPatientInfo } from "@/components/secretary/SecretaryPatientInfo";
import {
  periodFromStartAt,
  SHIFT_LABEL_AR,
} from "@/lib/doctor-availability";

type DoctorOpt = { id: string; name: string; type: string };

export function SecretaryScheduledBar({
  appointmentId,
  fullName,
  phone,
  age,
  city,
  doctorId,
  doctorName,
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
  const period = SHIFT_LABEL_AR[periodFromStartAt(startAtIso)];

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
    <div className="overflow-hidden rounded-2xl border border-teal/35 bg-white shadow-sm">
      <SecretaryPatientInfo
        fullName={fullName}
        phone={phone}
        age={age}
        city={city}
        queueOrder={queueOrder}
      >
        <span className="rounded-2xl bg-soft-teal px-2.5 py-1 text-xs font-semibold text-teal">
          {period} · {appointmentTypeLabel}
        </span>
        <span className="text-xs text-muted">{doctorName}</span>
      </SecretaryPatientInfo>

      <div className="mt-0 flex flex-col gap-2 border-t border-teal/20 bg-soft-teal/15 p-3 sm:flex-row sm:items-end">
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
          توجيه للطبيب
        </Button>
      </div>
      {error && <p className="px-3 pb-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
