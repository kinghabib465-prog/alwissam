"use client";

import { useState } from "react";
import { SecretaryDirectedBar } from "@/components/secretary/SecretaryDirectedBar";
import { toLatinDigits } from "@/lib/latin-digits";
import { Button } from "@/components/ui/Button";

type PatientItem = {
  entryId: string;
  patientId: string;
  fullName: string;
  phone: string;
  age?: number | null;
  city?: string | null;
  status: string;
  unpaidInvoiceId: string | null;
  amountLabel: string | null;
  queueOrder: number;
};

export type DoctorWindow = {
  doctorId: string;
  doctorName: string;
  color: string;
  typeLabel: string;
  count: number;
  waiting: number;
  withDoctor: number;
  needPay: number;
  patients: PatientItem[];
};

/**
 * عند فتح الموجهون: بطاقات أطباء بنفس تنسيق الموقع
 * بعد الاختيار: قائمة مرضى ذلك الطبيب
 */
export function DirectedDoctorPicker({
  doctors,
  csrfToken,
}: {
  doctors: DoctorWindow[];
  csrfToken: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = doctors.find((d) => d.doctorId === selectedId) || null;

  if (!selected) {
    return (
      <div className="space-y-5">
        <p className="text-center text-sm text-muted">
          اختر الطبيب لعرض الموجَّهين إليه
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((d) => (
            <button
              key={d.doctorId}
              type="button"
              onClick={() => setSelectedId(d.doctorId)}
              className="card-surface focus-ring group flex flex-col gap-4 p-5 text-right transition hover:border-teal/40 hover:bg-soft-teal/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ background: d.color }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-navy">
                      {d.doctorName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{d.typeLabel}</p>
                  </div>
                </div>
                <span className="font-latin flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-soft-teal text-lg font-bold text-teal">
                  {toLatinDigits(d.count)}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {d.waiting > 0 && (
                  <span className="rounded-2xl bg-[#FFF7E8] px-2.5 py-1 font-semibold text-warning">
                    انتظار {toLatinDigits(d.waiting)}
                  </span>
                )}
                {d.withDoctor > 0 && (
                  <span className="rounded-2xl bg-soft-teal px-2.5 py-1 font-semibold text-teal">
                    معاينة {toLatinDigits(d.withDoctor)}
                  </span>
                )}
                {d.needPay > 0 && (
                  <span className="rounded-2xl bg-[#E8F3F8] px-2.5 py-1 font-semibold text-blue">
                    دفع {toLatinDigits(d.needPay)}
                  </span>
                )}
                {d.count === 0 && (
                  <span className="rounded-2xl bg-background px-2.5 py-1 text-muted">
                    لا مرضى الآن
                  </span>
                )}
              </div>

              <span className="mt-auto text-sm font-semibold text-teal group-hover:text-navy">
                فتح القائمة
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 rounded-full"
            style={{ background: selected.color }}
          />
          <div>
            <p className="font-bold text-navy">{selected.doctorName}</p>
            <p className="text-xs text-muted">
              {selected.typeLabel} · {toLatinDigits(selected.count)} مريض
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setSelectedId(null)}>
          تغيير الطبيب
        </Button>
      </div>

      {selected.patients.length === 0 ? (
        <div className="card-surface p-6 text-center text-muted">
          لا مرضى موجَّهين لهذا الطبيب حالياً
        </div>
      ) : (
        <div className="space-y-2">
          {selected.patients.map((p) => (
            <SecretaryDirectedBar
              key={p.entryId}
              entryId={p.entryId}
              patientId={p.patientId}
              fullName={p.fullName}
              phone={p.phone}
              age={p.age}
              city={p.city}
              doctorName={selected.doctorName}
              status={p.status}
              unpaidInvoiceId={p.unpaidInvoiceId}
              amountLabel={p.amountLabel}
              csrfToken={csrfToken}
              queueOrder={p.queueOrder}
              hideDoctor
            />
          ))}
        </div>
      )}
    </div>
  );
}
