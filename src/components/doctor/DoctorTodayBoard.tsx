"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { StatusBadge } from "@/components/ui/Card";
import { cn, formatTime } from "@/lib/utils";
import { toLatinDigits } from "@/lib/latin-digits";
import { splitPatientName } from "@/lib/patient-name";

export type TodayAptView = {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  startAtIso: string;
  typeLabel: string;
  statusLabel: string;
  tone: "teal" | "success" | "warning" | "muted";
};

export type TodaySectionKey = "upcoming" | "waiting" | "withDoctor" | "done";

const SECTION_META: Record<
  TodaySectionKey,
  { title: string; hint: string; toneClass: string; defaultOpen: boolean }
> = {
  withDoctor: {
    title: "قيد المعاينة",
    hint: "المريض عندك الآن",
    toneClass: "bg-soft-teal text-teal",
    defaultOpen: true,
  },
  waiting: {
    title: "في الانتظار",
    hint: "وصلت السكرتارية — جاهز للمعاينة",
    toneClass: "bg-amber-100 text-amber-900",
    defaultOpen: true,
  },
  upcoming: {
    title: "لم يصلوا بعد",
    hint: "موعد اليوم ولم يُدخلوا بعد",
    toneClass: "bg-[#FFF7E8] text-warning",
    defaultOpen: false,
  },
  done: {
    title: "انتهوا اليوم",
    hint: "انتهت جلستهم — للمتابعة من مرضاي",
    toneClass: "bg-[#E8F8F0] text-success",
    defaultOpen: false,
  },
};

const ORDER: TodaySectionKey[] = [
  "withDoctor",
  "waiting",
  "upcoming",
  "done",
];

function PatientRow({
  apt,
  index,
}: {
  apt: TodayAptView;
  index: number;
}) {
  const { firstName, lastName } = splitPatientName(apt.patientName);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="font-latin flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-soft-teal text-sm font-bold text-teal">
          {toLatinDigits(index + 1)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-bold text-navy">
            {firstName}
            {lastName ? (
              <span className="mr-2 font-semibold text-teal">{lastName}</span>
            ) : null}
          </p>
          <p className="font-latin mt-0.5 text-xs text-muted">
            {toLatinDigits(formatTime(new Date(apt.startAtIso)))}
            {" · "}
            {apt.typeLabel}
            {" · "}
            {toLatinDigits(apt.phone || "—")}
          </p>
        </div>
      </div>
      <StatusBadge label={apt.statusLabel} tone={apt.tone} />
    </div>
  );
}

function CollapsibleSection({
  sectionKey,
  items,
  open,
  onToggle,
}: {
  sectionKey: TodaySectionKey;
  items: TodayAptView[];
  open: boolean;
  onToggle: () => void;
}) {
  if (items.length === 0) return null;
  const meta = SECTION_META[sectionKey];

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-3 text-right transition hover:bg-[#F8FBFC]"
        aria-expanded={open}
      >
        <span
          className={cn(
            "inline-flex rounded-xl px-2.5 py-1 text-xs font-bold",
            meta.toneClass,
          )}
        >
          {meta.title}
        </span>
        <span className="font-latin text-sm font-bold text-navy">
          {toLatinDigits(items.length)}
        </span>
        <span className="hidden flex-1 truncate text-xs text-muted sm:block">
          {meta.hint}
        </span>
        <ChevronDown
          className={cn(
            "mr-auto h-4 w-4 shrink-0 text-muted transition",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="space-y-2 border-t border-border px-3 py-3">
          <p className="text-xs text-muted sm:hidden">{meta.hint}</p>
          {items.map((apt, index) => (
            <PatientRow key={apt.id} apt={apt} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}

/** لوحة يوم العمل — أقسام منسدلة حسب مسار المريض في العيادة */
export function DoctorTodayBoard({
  sections,
}: {
  sections: Record<TodaySectionKey, TodayAptView[]>;
}) {
  const [openMap, setOpenMap] = useState<Record<TodaySectionKey, boolean>>(
    () => ({
      withDoctor:
        sections.withDoctor.length > 0
          ? SECTION_META.withDoctor.defaultOpen
          : false,
      waiting:
        sections.waiting.length > 0 ? SECTION_META.waiting.defaultOpen : false,
      upcoming:
        sections.upcoming.length > 0 &&
        sections.withDoctor.length === 0 &&
        sections.waiting.length === 0,
      done: false,
    }),
  );

  const total =
    sections.upcoming.length +
    sections.waiting.length +
    sections.withDoctor.length +
    sections.done.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-[#F5F8FB] px-3 py-2.5 text-xs">
        {ORDER.map((key) => {
          const n = sections[key].length;
          if (n === 0) return null;
          return (
            <button
              key={key}
              type="button"
              onClick={() =>
                setOpenMap((m) => ({ ...m, [key]: !m[key] }))
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-bold transition",
                openMap[key]
                  ? SECTION_META[key].toneClass
                  : "bg-white text-muted ring-1 ring-border",
              )}
            >
              {SECTION_META[key].title}
              <span className="font-latin">{toLatinDigits(n)}</span>
            </button>
          );
        })}
        <span className="mr-auto self-center font-latin text-muted">
          المجموع {toLatinDigits(total)}
        </span>
      </div>

      {ORDER.map((key) => (
        <CollapsibleSection
          key={key}
          sectionKey={key}
          items={sections[key]}
          open={openMap[key]}
          onToggle={() =>
            setOpenMap((m) => ({ ...m, [key]: !m[key] }))
          }
        />
      ))}
    </div>
  );
}
