"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { AppointmentDatePicker } from "@/components/doctor/AppointmentDatePicker";
import type { DoctorAvailability } from "@/lib/doctor-availability";
import {
  nextWorkingYmd,
  slotsForDate,
} from "@/lib/doctor-availability";
import { toLatinDigits } from "@/lib/latin-digits";

type DoctorOpt = {
  id: string;
  name: string;
  type: string;
  worksToday: boolean;
  color: string;
};

type PatientOpt = {
  id: string;
  fullName: string;
  phone: string;
  nextLabel?: string | null;
  nextAppointmentId?: string | null;
};

export function SecretaryScheduleForm({
  csrfToken,
  doctors,
  patients,
}: {
  csrfToken: string;
  doctors: DoctorOpt[];
  patients: PatientOpt[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState(
    doctors.find((d) => d.worksToday)?.id || doctors[0]?.id || "",
  );
  const [availability, setAvailability] = useState<DoctorAvailability | null>(
    null,
  );
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return patients.slice(0, 30);
    return patients
      .filter(
        (p) =>
          p.fullName.toLowerCase().includes(s) ||
          p.phone.includes(s) ||
          toLatinDigits(p.phone).includes(s),
      )
      .slice(0, 30);
  }, [q, patients]);

  const selected = patients.find((p) => p.id === patientId);

  useEffect(() => {
    if (!doctorId) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/doctor/availability?doctorId=${encodeURIComponent(doctorId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.ok || !data.availability) {
          setAvailability(null);
          return;
        }
        const av = data.availability as DoctorAvailability;
        setAvailability(av);
        const d = nextWorkingYmd(av.workDays, 0);
        const slots = slotsForDate(d, av.windowsByDay);
        setDate(d);
        setTime(slots[0] || "10:00");
      })
      .catch(() => {
        if (!cancelled) setAvailability(null);
      });
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  async function save() {
    if (!patientId || !doctorId || !date) {
      setError("اختر المريض والطبيب والوقت");
      return;
    }
    setLoading(true);
    setError("");
    setOk("");
    const editing = Boolean(selected?.nextAppointmentId);
    const res = await fetch("/api/secretary/schedule-appointment", {
      method: editing ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify(
        editing
          ? {
              appointmentId: selected!.nextAppointmentId,
              doctorId,
              date,
              time,
            }
          : {
              patientId,
              doctorId,
              date,
              time,
              appointmentType: "GENERAL_EXAM",
            },
      ),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل الحفظ");
      return;
    }
    setOk(editing ? "تم التعديل" : "تم تحديد الموعد");
    setPatientId("");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* 1 — المريض */}
      <section className="space-y-2">
        <p className="text-sm font-bold text-navy">1 · المريض</p>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف"
        />
        <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-border bg-[#F8FBFC] p-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPatientId(p.id)}
              className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                patientId === p.id
                  ? "bg-teal text-white shadow"
                  : "bg-white text-navy ring-1 ring-border hover:ring-teal"
              }`}
            >
              {p.fullName}
              {p.nextLabel ? (
                <span className="mr-1 block font-latin text-[11px] opacity-80">
                  {toLatinDigits(p.nextLabel)}
                </span>
              ) : null}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted">لا مرضى</p>
          )}
        </div>
      </section>

      {/* 2 — الطبيب */}
      <section className="space-y-2">
        <p className="text-sm font-bold text-navy">2 · الطبيب الحاضر</p>
        <div className="flex flex-wrap gap-2">
          {doctors.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDoctorId(d.id)}
              className={`rounded-2xl px-4 py-3 text-sm font-bold text-white shadow transition ${
                doctorId === d.id ? "scale-[1.03] ring-4 ring-navy/20" : "opacity-85"
              }`}
              style={{
                background: d.worksToday ? d.color || "#0d9488" : "#94a3b8",
              }}
            >
              {d.name}
              <span className="mt-0.5 block text-[11px] font-medium opacity-90">
                {d.worksToday ? "حاضر اليوم" : "خارج الدوام"}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3 — التاريخ والساعة */}
      <section className="space-y-2">
        <p className="text-sm font-bold text-navy">3 · التاريخ والساعة</p>
        {availability ? (
          <div className="rounded-2xl border-2 border-blue/30 bg-blue/5 p-4">
            <AppointmentDatePicker
              availability={availability}
              date={date}
              time={time}
              onDateChange={setDate}
              onTimeChange={setTime}
            />
          </div>
        ) : (
          <p className="text-sm text-danger">اختر طبيباً له أيام عمل</p>
        )}
      </section>

      {error && <p className="text-sm font-semibold text-danger">{error}</p>}
      {ok && <p className="text-sm font-semibold text-teal">{ok}</p>}

      <Button
        size="lg"
        variant="teal"
        className="w-full text-base"
        loading={loading}
        disabled={!patientId || !availability}
        onClick={save}
      >
        {selected?.nextAppointmentId ? "تعديل الموعد" : "حفظ الموعد"}
      </Button>
    </div>
  );
}
