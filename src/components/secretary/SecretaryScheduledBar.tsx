"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Form";
import { splitPatientName } from "@/lib/patient-name";
import { toLatinDigits } from "@/lib/latin-digits";
import {
  periodFromStartAt,
  SHIFT_LABEL_AR,
} from "@/lib/doctor-availability";

type DoctorOpt = { id: string; name: string; type: string };

/** صف موعد اليوم — الاسم ظاهر دائماً ومرقّم للسكرتارية */
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const period = SHIFT_LABEL_AR[periodFromStartAt(startAtIso)];
  const { firstName, lastName } = splitPatientName(fullName);
  const phoneLabel =
    phone && phone !== "غير محدد" && !String(phone).startsWith("بدون-")
      ? toLatinDigits(phone)
      : "—";

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
      <div className="flex items-start gap-3 px-3 py-3 sm:px-4">
        <span className="font-latin flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-soft-teal text-base font-bold tabular-nums text-teal">
          {toLatinDigits(queueOrder)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold leading-snug text-navy">
            {firstName || fullName || "—"}
            {lastName ? (
              <span className="mr-2 font-semibold text-teal">{lastName}</span>
            ) : null}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
            <span className="font-bold text-teal">{period}</span>
            <span aria-hidden>·</span>
            <span>{appointmentTypeLabel}</span>
            <span aria-hidden>·</span>
            <span>{doctorName}</span>
          </p>
          <button
            type="button"
            className="mt-1.5 text-xs font-semibold text-teal hover:underline"
            onClick={() => setDetailsOpen((v) => !v)}
          >
            {detailsOpen ? "إخفاء التفاصيل" : "هاتف · عمر · مدينة"}
          </button>
          {detailsOpen ? (
            <div className="mt-2 space-y-1 rounded-xl bg-[#F8FBFC] px-3 py-2 text-sm">
              <p>
                <span className="text-muted">الاسم الكامل: </span>
                <span className="font-bold text-navy">{fullName}</span>
              </p>
              <p>
                <span className="text-muted">الهاتف: </span>
                <span className="font-latin font-semibold tabular-nums">
                  {phoneLabel}
                </span>
              </p>
              <p>
                <span className="text-muted">العمر: </span>
                <span className="font-latin font-semibold tabular-nums">
                  {age != null ? toLatinDigits(age) : "—"}
                </span>
              </p>
              <p>
                <span className="text-muted">المدينة: </span>
                <span className="font-semibold">{city?.trim() || "—"}</span>
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-teal/20 bg-soft-teal/15 p-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <p className="mb-1 text-xs text-muted">توجيه إلى الطبيب</p>
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
