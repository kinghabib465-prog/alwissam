"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { EmptyState } from "@/components/ui/Card";
import { SecretaryScheduledBar } from "@/components/secretary/SecretaryScheduledBar";
import { toLatinDigits } from "@/lib/latin-digits";
import { CLINIC_SHIFT_HOURS } from "@/lib/clinic-shifts";

export type TodayAptClient = {
  id: string;
  fullName: string;
  phone: string;
  age?: number | null;
  city?: string | null;
  doctorId: string;
  doctorName: string;
  startAtIso: string;
  appointmentTypeLabel: string;
  period: "MORNING" | "EVENING" | "DAY";
};

type DoctorOpt = { id: string; name: string; type: string };

/**
 * خانة منسدلة «مواعيد اليوم» —
 * مواعيد بتاريخ اليوم فقط · السكرتير يوجّه منها · بدون فتح حساب.
 */
export function SecretaryTodayAppointmentsDrop({
  todayLabel,
  clinicShift,
  morning,
  evening,
  doctors,
  csrfToken,
  defaultOpen = true,
}: {
  todayLabel: string;
  clinicShift: "MORNING" | "EVENING" | null;
  morning: TodayAptClient[];
  evening: TodayAptClient[];
  doctors: DoctorOpt[];
  csrfToken: string;
  defaultOpen?: boolean;
}) {
  const showMorning =
    clinicShift === "MORNING" || clinicShift === null;
  const showEvening =
    clinicShift === "EVENING" || clinicShift === null;

  const visibleMorning = showMorning ? morning : [];
  const visibleEvening = showEvening ? evening : [];
  const total = visibleMorning.length + visibleEvening.length;
  const [open, setOpen] = useState(defaultOpen);

  const shiftHint =
    clinicShift === "MORNING"
      ? `الفترة الآن: صباحي ${CLINIC_SHIFT_HOURS.MORNING.start}–${CLINIC_SHIFT_HOURS.MORNING.end}`
      : clinicShift === "EVENING"
        ? `الفترة الآن: مسائي ${CLINIC_SHIFT_HOURS.EVENING.start}–${CLINIC_SHIFT_HOURS.EVENING.end}`
        : "خارج أوقات الدوام — تظهر كل مواعيد اليوم";

  return (
    <details
      className="group mb-5 overflow-hidden rounded-2xl border border-teal/40 bg-white shadow-sm"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal text-xs font-bold text-white">
          1
        </span>
        <div className="min-w-0 flex-1 text-right">
          <p className="font-bold text-navy">مواعيد اليوم</p>
          <p className="font-latin mt-0.5 text-xs tabular-nums text-muted">
            {todayLabel}
            {" · "}
            {toLatinDigits(total)} بانتظار التوجيه
          </p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted transition group-open:rotate-180" />
      </summary>

      <div className="space-y-4 border-t border-border px-3 py-3 sm:px-4">
        <p className="font-latin text-xs tabular-nums text-muted">{shiftHint}</p>
        <p className="text-xs text-muted">
          مواعيد حجزها الطبيب (بدون فتح حساب) — عند وصول المريض وجّهيه من هنا
          للطبيب.
        </p>

        {total === 0 ? (
          <EmptyState
            title={
              clinicShift === "MORNING"
                ? "لا مواعيد صباحية بانتظار التوجيه"
                : clinicShift === "EVENING"
                  ? "لا مواعيد مسائية بانتظار التوجيه"
                  : "لا مواعيد اليوم بانتظار التوجيه"
            }
            description="عندما يحين يوم الموعد يظهر هنا — الصباح في الصباح والمساء في المساء."
          />
        ) : (
          <>
            {visibleMorning.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-bold text-teal">
                  صباحي{" "}
                  <span className="font-latin tabular-nums">
                    ({toLatinDigits(visibleMorning.length)})
                  </span>
                  <span className="font-latin mr-2 text-xs font-normal tabular-nums text-muted">
                    {CLINIC_SHIFT_HOURS.MORNING.start}–
                    {CLINIC_SHIFT_HOURS.MORNING.end}
                  </span>
                </p>
                {visibleMorning.map((apt, index) => (
                  <SecretaryScheduledBar
                    key={apt.id}
                    appointmentId={apt.id}
                    fullName={apt.fullName}
                    phone={apt.phone}
                    age={apt.age}
                    city={apt.city}
                    doctorId={apt.doctorId}
                    doctorName={apt.doctorName}
                    startAtIso={apt.startAtIso}
                    appointmentTypeLabel={apt.appointmentTypeLabel}
                    queueOrder={index + 1}
                    doctors={doctors}
                    csrfToken={csrfToken}
                  />
                ))}
              </div>
            ) : null}

            {visibleEvening.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-bold text-teal">
                  مسائي{" "}
                  <span className="font-latin tabular-nums">
                    ({toLatinDigits(visibleEvening.length)})
                  </span>
                  <span className="font-latin mr-2 text-xs font-normal tabular-nums text-muted">
                    {CLINIC_SHIFT_HOURS.EVENING.start}–
                    {CLINIC_SHIFT_HOURS.EVENING.end}
                  </span>
                </p>
                {visibleEvening.map((apt, index) => (
                  <SecretaryScheduledBar
                    key={apt.id}
                    appointmentId={apt.id}
                    fullName={apt.fullName}
                    phone={apt.phone}
                    age={apt.age}
                    city={apt.city}
                    doctorId={apt.doctorId}
                    doctorName={apt.doctorName}
                    startAtIso={apt.startAtIso}
                    appointmentTypeLabel={apt.appointmentTypeLabel}
                    queueOrder={
                      visibleMorning.length + index + 1
                    }
                    doctors={doctors}
                    csrfToken={csrfToken}
                  />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </details>
  );
}
