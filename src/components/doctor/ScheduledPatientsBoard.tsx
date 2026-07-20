"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduledPatientGroup } from "@/lib/scheduled-patients";

export function ScheduledPatientsBoard({
  groups,
}: {
  groups: ScheduledPatientGroup[];
}) {
  const [openId, setOpenId] = useState<string | null>(
    groups.length === 1 ? groups[0]!.patientId : null,
  );

  if (groups.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted">
        لا يوجد مرضى لديهم موعد محجوز حالياً
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const open = openId === g.patientId;
        return (
          <div
            key={g.patientId}
            className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right"
              onClick={() => setOpenId(open ? null : g.patientId)}
            >
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-navy">
                  {g.patientName}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  الموعد القادم: {g.nextLabel}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal">
                {open ? "إخفاء" : "عرض التفاصيل"}
              </span>
            </button>

            {open && (
              <div className="space-y-3 border-t border-border bg-[#F7FAFC] p-3 sm:p-4">
                {g.cards.map((card) => (
                  <VisitCard key={card.id} card={card} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VisitCard({
  card,
}: {
  card: ScheduledPatientGroup["cards"][number];
}) {
  const hasNext = !card.treatmentFinished && card.nextDateLabel;

  return (
    <article className="grid overflow-hidden rounded-2xl border border-border bg-white sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.42fr)]">
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2F6FED] text-sm font-bold text-white">
            {card.index}
          </span>
          <p className="text-sm font-semibold text-navy">
            {card.dateLabel}
            <span className="mx-1.5 text-muted">·</span>
            <Clock className="inline-block h-3.5 w-3.5 align-[-2px] text-muted" />{" "}
            {card.timeLabel}
          </p>
        </div>
        <p className="text-sm text-navy">
          <span className="font-bold">المريض:</span> {card.patientName}
        </p>
        {card.visitReason ? (
          <p className="text-sm text-navy">
            <span className="font-bold">سبب الزيارة:</span> {card.visitReason}
          </p>
        ) : null}
        {card.workPerformed ? (
          <p className="text-sm font-semibold text-emerald-700">
            <span className="font-bold">ما تم عمله :</span> {card.workPerformed}
          </p>
        ) : null}
        <p
          className={cn(
            "mt-2 inline-flex items-center gap-1.5 text-sm font-semibold",
            card.treatmentFinished ? "text-emerald-700" : "text-emerald-600",
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          {card.statusLabel}
        </p>
      </div>

      <aside className="border-t border-border bg-[#EEF5FF] p-4 sm:border-t-0 sm:border-r">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[#2F6FED]">
          <CalendarDays className="h-4 w-4" />
          الموعد القادم
        </div>
        {hasNext ? (
          <>
            <p className="text-sm font-semibold text-[#2F6FED]">
              {card.nextDateLabel}
            </p>
            <p className="mt-0.5 text-sm text-[#2F6FED]">{card.nextTimeLabel}</p>
            <div className="my-3 border-t border-dashed border-[#B7C9E8]" />
            <p className="text-xs font-bold text-navy">ملاحظة الموعد القادم</p>
            <p className="mt-1 text-sm leading-6 text-navy">
              {card.followUpNote || "—"}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-muted">لا يوجد موعد قادم</p>
            <div className="my-3 border-t border-dashed border-[#B7C9E8]" />
            <p className="text-sm font-semibold text-emerald-700">انتهى العلاج</p>
          </>
        )}
      </aside>
    </article>
  );
}
