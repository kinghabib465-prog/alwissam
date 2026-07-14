"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/Card";
import {
  DoctorPatientCard,
  type PatientRowData,
} from "@/components/doctor/DoctorPatientCard";
import type { DoctorAvailability } from "@/lib/doctor-availability";
import { toLatinDigits } from "@/lib/latin-digits";

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

type TabKey = "today" | "upcoming" | "no_appt" | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "today", label: "موعد اليوم" },
  { key: "upcoming", label: "قادم" },
  { key: "no_appt", label: "بدون موعد" },
  { key: "all", label: "الكل" },
];

function sectionOf(p: PatientRowData, today: string): TabKey {
  const ymd = algiersYmd(p.nextAtIso);
  if (!ymd) return "no_appt";
  if (ymd === today) return "today";
  if (ymd > today) return "upcoming";
  return "no_appt"; // موعد قديم منتهٍ
}

function sortPatients(list: PatientRowData[]) {
  return [...list].sort((a, b) => {
    // أولاً: أقرب موعد
    const ta = a.nextAtIso ? new Date(a.nextAtIso).getTime() : Number.MAX_SAFE_INTEGER;
    const tb = b.nextAtIso ? new Date(b.nextAtIso).getTime() : Number.MAX_SAFE_INTEGER;
    if (ta !== tb) return ta - tb;
    // ثانياً: لم يدفع أولاً
    if (a.paidLabel === "لم يدفع" && b.paidLabel !== "لم يدفع") return -1;
    if (b.paidLabel === "لم يدفع" && a.paidLabel !== "لم يدفع") return 1;
    // ثالثاً: الاسم
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

/** قائمة مرضاي — مرتبة وسهلة للطبيب */
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

  const searched = useMemo(
    () => patients.filter((p) => matchesSearch(p, query)),
    [patients, query],
  );

  const groups = useMemo(() => {
    const todayList: PatientRowData[] = [];
    const upcoming: PatientRowData[] = [];
    const noAppt: PatientRowData[] = [];
    for (const p of searched) {
      const s = sectionOf(p, today);
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

  const defaultTab: TabKey =
    counts.today > 0 ? "today" : counts.upcoming > 0 ? "upcoming" : "all";
  const [tab, setTab] = useState<TabKey>(defaultTab);

  const visible =
    tab === "today"
      ? groups.today
      : tab === "upcoming"
        ? groups.upcoming
        : tab === "no_appt"
          ? groups.no_appt
          : groups.all;

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="بحث بالاسم أو الهاتف..."
        aria-label="بحث"
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-2xl px-3 py-3 text-sm font-bold transition ${
              tab === t.key
                ? "bg-teal text-white shadow-sm"
                : "card-surface text-navy hover:border-teal/40"
            }`}
          >
            <span className="block">{t.label}</span>
            <span
              className={`font-latin mt-1 block text-lg ${
                tab === t.key ? "text-white" : "text-teal"
              }`}
            >
              {toLatinDigits(counts[t.key])}
            </span>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted">
        مرتّب حسب أقرب موعد · اضغط المريض للمعلومات وQR والموعد
      </p>

      {visible.length === 0 ? (
        <EmptyState
          title="لا مرضى هنا"
          description={
            query
              ? "لا نتائج لهذا البحث"
              : tab === "today"
                ? "لا مواعيد اليوم — راجع «قادم» أو «بدون موعد»"
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
