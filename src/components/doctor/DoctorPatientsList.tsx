"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/Card";
import {
  DoctorPatientCard,
  type PatientRowData,
} from "@/components/doctor/DoctorPatientCard";
import type { DoctorAvailability } from "@/lib/doctor-availability";
import { toLatinDigits } from "@/lib/latin-digits";
import { cn } from "@/lib/utils";

function algiersYmd(iso?: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function todayYmd() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

type FilterKey = "today" | "upcoming" | "no_appt" | "all";

const FILTERS: { key: FilterKey; label: string; hint: string }[] = [
  { key: "today", label: "موعد اليوم", hint: "يحتاجون متابعة هذا اليوم" },
  { key: "upcoming", label: "مواعيد قادمة", hint: "محجوز لهم لاحقاً" },
  { key: "no_appt", label: "بدون موعد", hint: "يحتاجون جدولة" },
  { key: "all", label: "كل المرضى", hint: "القائمة كاملة" },
];

function bucketOf(p: PatientRowData, today: string): FilterKey {
  const ymd = algiersYmd(p.nextAtIso);
  if (!ymd) return "no_appt";
  if (ymd === today) return "today";
  if (ymd > today) return "upcoming";
  return "no_appt";
}

function sortPatients(list: PatientRowData[]) {
  return [...list].sort((a, b) => {
    const ta = a.nextAtIso
      ? new Date(a.nextAtIso).getTime()
      : Number.MAX_SAFE_INTEGER;
    const tb = b.nextAtIso
      ? new Date(b.nextAtIso).getTime()
      : Number.MAX_SAFE_INTEGER;
    if (ta !== tb) return ta - tb;
    if (a.paidLabel === "لم يدفع" && b.paidLabel !== "لم يدفع") return -1;
    if (b.paidLabel === "لم يدفع" && a.paidLabel !== "لم يدفع") return 1;
    return a.fullName.localeCompare(b.fullName, "ar");
  });
}

function matchesSearch(p: PatientRowData, q: string) {
  if (!q.trim()) return true;
  const needle = q.trim().toLowerCase();
  return [p.fullName, p.phone, p.city || "", p.nextLabel || ""]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

/** قائمة مرضاي — تصفية منسدلة + مريض واحد مفتوح */
export function DoctorPatientsList({
  patients,
  csrfToken,
  canManage,
  availability,
  generalAvailability,
}: {
  patients: PatientRowData[];
  csrfToken: string;
  canManage?: boolean;
  availability?: DoctorAvailability | null;
  generalAvailability?: DoctorAvailability | null;
}) {
  const today = todayYmd();
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [openPatientId, setOpenPatientId] = useState<string | null>(null);

  const searched = useMemo(
    () => patients.filter((p) => matchesSearch(p, query)),
    [patients, query],
  );

  const groups = useMemo(() => {
    const todayList: PatientRowData[] = [];
    const upcoming: PatientRowData[] = [];
    const noAppt: PatientRowData[] = [];
    for (const p of searched) {
      const s = bucketOf(p, today);
      if (s === "today") todayList.push(p);
      else if (s === "upcoming") upcoming.push(p);
      else noAppt.push(p);
    }
    return {
      today: sortPatients(todayList),
      upcoming: sortPatients(upcoming),
      no_appt: sortPatients(noAppt),
      all: sortPatients(searched),
    };
  }, [searched, today]);

  const counts = {
    today: groups.today.length,
    upcoming: groups.upcoming.length,
    no_appt: groups.no_appt.length,
    all: groups.all.length,
  };

  const defaultFilter: FilterKey =
    counts.today > 0 ? "today" : counts.upcoming > 0 ? "upcoming" : "all";
  const [filter, setFilter] = useState<FilterKey>(defaultFilter);

  const active = FILTERS.find((f) => f.key === filter) || FILTERS[3];
  const visible = groups[filter];

  function pickFilter(key: FilterKey) {
    setFilter(key);
    setFilterOpen(false);
    setOpenPatientId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="min-w-0 flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف..."
            aria-label="بحث"
          />
        </div>

        {/* قائمة منسدلة للتصفية — مثل الإعدادات */}
        <div className="relative sm:w-56">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
            className="flex w-full items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2.5 text-sm font-bold text-navy shadow-sm transition hover:border-teal/40"
          >
            <span className="flex-1 text-right">
              {active.label}
              <span className="font-latin mr-2 text-teal">
                ({toLatinDigits(counts[filter])})
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted transition",
                filterOpen && "rotate-180",
              )}
            />
          </button>
          {filterOpen && (
            <div
              className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-2xl border border-border bg-white shadow-lg"
              role="listbox"
            >
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="option"
                  aria-selected={filter === f.key}
                  onClick={() => pickFilter(f.key)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-3 py-2.5 text-right text-sm transition",
                    filter === f.key
                      ? "bg-soft-teal/50 text-navy"
                      : "hover:bg-[#F8FBFC]",
                  )}
                >
                  <span className="font-bold">
                    {f.label}
                    <span className="font-latin mr-2 text-teal">
                      {toLatinDigits(counts[f.key])}
                    </span>
                  </span>
                  <span className="text-xs text-muted">{f.hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted">{active.hint}</p>

      {visible.length === 0 ? (
        <EmptyState
          title="لا مرضى هنا"
          description={
            query
              ? "لا نتائج لهذا البحث"
              : filter === "today"
                ? "لا مواعيد اليوم — افتح القائمة المنسدلة واختر «قادم» أو «بدون موعد»"
                : "لا عناصر في هذا القسم"
          }
        />
      ) : (
        <div className="space-y-2">
          {visible.map((p) => (
            <DoctorPatientCard
              key={p.id}
              patient={p}
              csrfToken={csrfToken}
              canManage={canManage}
              availability={availability}
              generalAvailability={generalAvailability}
              expanded={openPatientId === p.id}
              onExpandedChange={(next) =>
                setOpenPatientId(next ? p.id : null)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
