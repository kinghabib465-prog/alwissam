"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toothStateAr } from "@/i18n/ar";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Form";

const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

type Tooth = {
  toothNumber: number;
  state: string;
  notes?: string | null;
};

export function DentalChartView({
  patientId,
  teeth,
  canEdit,
  csrfToken,
}: {
  patientId: string;
  teeth: Tooth[];
  canEdit: boolean;
  csrfToken: string;
}) {
  const router = useRouter();
  const map = useMemo(() => {
    const m = new Map<number, Tooth>();
    teeth.forEach((t) => m.set(t.toothNumber, t));
    return m;
  }, [teeth]);
  const [selected, setSelected] = useState<number | null>(null);
  const [state, setState] = useState("HEALTHY");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!selected || !canEdit) return;
    setLoading(true);
    await fetch(`/api/medical/dental-chart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ patientId, toothNumber: selected, state }),
    });
    setLoading(false);
    router.refresh();
  }

  function ToothButton({ num }: { num: number }) {
    const current = map.get(num);
    const active = selected === num;
    return (
      <button
        type="button"
        onClick={() => {
          setSelected(num);
          setState(current?.state || "HEALTHY");
        }}
        className={`flex h-10 w-8 items-center justify-center rounded-lg border text-xs font-latin ${
          active
            ? "border-teal bg-soft-teal text-teal"
            : current && current.state !== "HEALTHY"
              ? "border-warning bg-[#FFF7E8] text-navy"
              : "border-border bg-white text-muted"
        }`}
        title={current ? toothStateAr[current.state] : toothStateAr.HEALTHY}
      >
        {num}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-center gap-1">
        {UPPER.map((n) => (
          <ToothButton key={n} num={n} />
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-1">
        {LOWER.map((n) => (
          <ToothButton key={n} num={n} />
        ))}
      </div>
      {canEdit && selected && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-background p-3">
          <div>
            <p className="mb-1 text-xs text-muted">السن المحدد</p>
            <p className="font-latin font-semibold">{selected}</p>
          </div>
          <div className="min-w-48 flex-1">
            <Select value={state} onChange={(e) => setState(e.target.value)}>
              {Object.entries(toothStateAr).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <Button loading={loading} onClick={save}>
            حفظ حالة السن
          </Button>
        </div>
      )}
    </div>
  );
}
