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

function PeriodBlock({
  title,
  hours,
  items,
  doctors,
  csrfToken,
}: {
  title: string;
  hours: string;
  items: TodayAptClient[];
  doctors: DoctorOpt[];
  csrfToken: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-teal">
        {title}{" "}
        <span className="font-latin tabular-nums">
          ({toLatinDigits(items.length)})
        </span>
        <span className="font-latin mr-2 text-xs font-normal tabular-nums text-muted">
          {hours}
        </span>
      </p>
      <ol className="rounded-xl border border-border/80 bg-[#F8FBFC] px-3 py-2 text-sm">
        {items.map((apt, index) => (
          <li
            key={`name-${apt.id}`}
            className="flex gap-2 border-b border-border/50 py-1.5 last:border-0"
          >
            <span className="font-latin w-6 shrink-0 font-bold tabular-nums text-teal">
              {toLatinDigits(index + 1)}.
            </span>
            <span className="font-bold text-navy">{apt.fullName}</span>
            <span className="mr-auto text-xs text-muted">{apt.doctorName}</span>
          </li>
        ))}
      </ol>
      {items.map((apt, index) => (
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
  );
}

/**
 * مواعيد اليوم — نفس المنطق في الاستقبال وفي أي تبويب.
 * compactHeader: داخل مركز الاستقبال بدون خانة منسدلة مكررة.
 */
export function SecretaryTodayAppointmentsDrop({
  todayLabel,
  clinicShift,
  morning,
  evening,
  doctors,
  csrfToken,
  defaultOpen = true,
  compactHeader = false,
}: {
  todayLabel: string;
  clinicShift: "MORNING" | "EVENING" | null;
  morning: TodayAptClient[];
  evening: TodayAptClient[];
  doctors: DoctorOpt[];
  csrfToken: string;
  defaultOpen?: boolean;
  compactHeader?: boolean;
}) {
  const visibleMorning = morning;
  const visibleEvening = clinicShift === "MORNING" ? [] : evening;
  const total = visibleMorning.length + visibleEvening.length;
  const [open, setOpen] = useState(defaultOpen);

  const shiftHint =
    clinicShift === "MORNING"
      ? `الفترة الآن: صباحي ${CLINIC_SHIFT_HOURS.MORNING.start}–${CLINIC_SHIFT_HOURS.MORNING.end}`
      : clinicShift === "EVENING"
        ? `الفترة الآن: مسائي ${CLINIC_SHIFT_HOURS.EVENING.start}–${CLINIC_SHIFT_HOURS.EVENING.end} — مع أي صباحي متأخر`
        : "خارج أوقات الدوام — كل مواعيد اليوم";

  const body = (
    <div className={compactHeader ? "space-y-4" : "space-y-4 border-t border-border px-3 py-3 sm:px-4"}>
      <p className="font-latin text-xs tabular-nums text-muted">
        {todayLabel} · {shiftHint}
      </p>
      <p className="text-xs text-muted">
        نفس قائمة المواعيد السابقة: أسماء مرتّبة · توجيه للطبيب عند الوصول.
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
          description="الموعد الذي يحدده الطبيب يظهر هنا في يومه فقط."
        />
      ) : (
        <>
          <PeriodBlock
            title={
              clinicShift === "EVENING" ? "صباحي (لم يُوجَّه بعد)" : "صباحي"
            }
            hours={`${CLINIC_SHIFT_HOURS.MORNING.start}–${CLINIC_SHIFT_HOURS.MORNING.end}`}
            items={visibleMorning}
            doctors={doctors}
            csrfToken={csrfToken}
          />
          <PeriodBlock
            title="مسائي"
            hours={`${CLINIC_SHIFT_HOURS.EVENING.start}–${CLINIC_SHIFT_HOURS.EVENING.end}`}
            items={visibleEvening}
            doctors={doctors}
            csrfToken={csrfToken}
          />
        </>
      )}
    </div>
  );

  if (compactHeader) {
    return (
      <div className="overflow-hidden rounded-2xl border border-teal/35 bg-white p-3 shadow-sm sm:p-4">
        {body}
      </div>
    );
  }

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
      {body}
    </details>
  );
}
