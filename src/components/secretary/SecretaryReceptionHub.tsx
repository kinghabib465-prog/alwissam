"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, EmptyState } from "@/components/ui/Card";
import { SecretaryWalkInForm } from "@/components/secretary/SecretaryWalkInForm";
import { SecretaryRequestBar } from "@/components/secretary/SecretaryRequestBar";
import { SecretaryTodayAppointmentsDrop } from "@/components/secretary/SecretaryTodayAppointmentsDrop";
import type { TodayAptClient } from "@/components/secretary/SecretaryTodayAppointmentsDrop";
import {
  DirectedDoctorPicker,
  type DoctorWindow,
} from "@/components/secretary/DirectedDoctorPicker";
import { CollectDoctorChargeForm } from "@/components/secretary/CollectDoctorChargeForm";
import { toLatinDigits } from "@/lib/latin-digits";
import { formatCurrencyDZD, formatArabicDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type ReceptionTab = "today" | "intake" | "waiting" | "pay";

type DoctorOpt = { id: string; name: string; type: string };

type IntakeRequest = {
  id: string;
  fullName: string;
  phone: string;
  age?: number | null;
  city?: string | null;
  chronicIllnesses?: string | null;
  isPreviousPatient?: boolean | null;
  appointmentType: string;
  reason?: string | null;
};

type OpenInvoice = {
  id: string;
  patientName: string;
  amount: number;
  entryId?: string | null;
  appointmentId?: string | null;
};

type RecentPayment = {
  id: string;
  patientName: string;
  amount: number;
  receiptNumber: string;
  paymentDate: string;
};

const TABS: {
  id: ReceptionTab;
  label: string;
  hint: string;
}[] = [
  {
    id: "today",
    label: "مواعيد اليوم",
    hint: "صباح / مساء — توجيه من الموعد",
  },
  {
    id: "intake",
    label: "المدخل",
    hint: "تسجيل جديد أو من الموقع",
  },
  {
    id: "waiting",
    label: "الانتظار",
    hint: "من وُجّهوا للطبيب",
  },
  {
    id: "pay",
    label: "الدفع",
    hint: "بعد المعاينة",
  },
];

/**
 * استقبال واحد منظم — أربع مناطق فقط، بدون غرف مكررة.
 */
export function SecretaryReceptionHub({
  todayLabel,
  clinicShift,
  morning,
  evening,
  intakeRequests,
  windows,
  openInvoices,
  recentPayments,
  doctors,
  csrfToken,
  initialTab,
}: {
  todayLabel: string;
  clinicShift: "MORNING" | "EVENING" | null;
  morning: TodayAptClient[];
  evening: TodayAptClient[];
  intakeRequests: IntakeRequest[];
  windows: DoctorWindow[];
  openInvoices: OpenInvoice[];
  recentPayments: RecentPayment[];
  doctors: DoctorOpt[];
  csrfToken: string;
  initialTab?: ReceptionTab;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const waitingCount = windows.reduce((s, w) => s + w.count, 0);
  const todayCount = morning.length + evening.length;
  const payCount = openInvoices.length;

  const counts: Record<ReceptionTab, number> = {
    today: todayCount,
    intake: intakeRequests.length,
    waiting: waitingCount,
    pay: payCount,
  };

  const smartDefault = useMemo((): ReceptionTab => {
    if (initialTab && TABS.some((t) => t.id === initialTab)) return initialTab;
    if (payCount > 0) return "pay";
    if (waitingCount > 0) return "waiting";
    if (todayCount > 0) return "today";
    return "intake";
  }, [initialTab, payCount, waitingCount, todayCount]);

  const [tab, setTab] = useState<ReceptionTab>(smartDefault);

  useEffect(() => {
    const q = searchParams.get("tab") as ReceptionTab | null;
    if (q && TABS.some((t) => t.id === q)) setTab(q);
    const inv = searchParams.get("invoice");
    if (inv) {
      setTab("pay");
      const t = window.setTimeout(() => {
        document
          .getElementById(`invoice-${inv}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
      return () => window.clearTimeout(t);
    }
  }, [searchParams]);

  function selectTab(next: ReceptionTab) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        مسار بسيط: مواعيد اليوم أو المدخل → انتظار → دفع. الأوقات حسب دوام
        العيادة.
      </p>

      <div
        className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-white p-1.5 shadow-sm"
        role="tablist"
        aria-label="أقسام الاستقبال"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          const n = counts[t.id];
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(t.id)}
              className={cn(
                "min-w-[7.5rem] flex-1 rounded-xl px-3 py-2.5 text-center transition",
                active
                  ? "bg-teal text-white shadow-sm"
                  : "text-navy hover:bg-soft-teal/40",
              )}
            >
              <span className="block text-sm font-bold">{t.label}</span>
              <span
                className={cn(
                  "font-latin mt-0.5 block text-[11px] tabular-nums",
                  active ? "text-white/85" : "text-muted",
                )}
              >
                {toLatinDigits(n)}
                {active ? "" : ` · ${t.hint}`}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "today" ? (
        <SecretaryTodayAppointmentsDrop
          todayLabel={todayLabel}
          clinicShift={clinicShift}
          morning={morning}
          evening={evening}
          doctors={doctors}
          csrfToken={csrfToken}
          defaultOpen
          compactHeader
        />
      ) : null}

      {tab === "intake" ? (
        <section className="space-y-3">
          <Card>
            <h2 className="mb-2 text-base font-bold text-navy">
              تسجيل عند المدخل
            </h2>
            <p className="mb-3 text-xs text-muted">
              مريض بدون موعد أو تسجيل من الموقع — نفس منطق التوجيه بعد الحفظ.
            </p>
            <SecretaryWalkInForm csrfToken={csrfToken} />
          </Card>
          <Card>
            {intakeRequests.length === 0 ? (
              <EmptyState
                title="لا طلبات بانتظار التوجيه"
                description="الطلبات الجديدة من الموقع تظهر هنا."
              />
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-bold text-navy">
                  بانتظار التوجيه: {toLatinDigits(intakeRequests.length)}
                </p>
                {intakeRequests.map((req, index) => (
                  <SecretaryRequestBar
                    key={req.id}
                    requestId={req.id}
                    fullName={req.fullName}
                    phone={req.phone}
                    age={req.age}
                    city={req.city}
                    chronicIllnesses={req.chronicIllnesses}
                    isPreviousPatient={req.isPreviousPatient ?? undefined}
                    appointmentType={req.appointmentType}
                    reason={req.reason}
                    queueOrder={index + 1}
                    doctors={doctors}
                    csrfToken={csrfToken}
                  />
                ))}
              </div>
            )}
          </Card>
        </section>
      ) : null}

      {tab === "waiting" ? (
        <section>
          {waitingCount === 0 ? (
            <Card>
              <EmptyState
                title="لا أحد في الانتظار الآن"
                description="بعد التوجيه من مواعيد اليوم أو المدخل يظهر المريض هنا تحت طبيبه."
              />
            </Card>
          ) : (
            <DirectedDoctorPicker doctors={windows} csrfToken={csrfToken} />
          )}
        </section>
      ) : null}

      {tab === "pay" ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-bold text-navy">بانتظار الاستلام</h2>
            {openInvoices.length === 0 ? (
              <EmptyState
                title="لا مبالغ الآن"
                description="يظهر المبلغ هنا بعد إنهاء الطبيب للمعاينة."
              />
            ) : (
              <div className="space-y-3">
                {openInvoices.map((inv) => (
                  <div key={inv.id} id={`invoice-${inv.id}`}>
                    <CollectDoctorChargeForm
                      invoiceId={inv.id}
                      patientName={inv.patientName}
                      amount={inv.amount}
                      csrfToken={csrfToken}
                      entryId={inv.entryId || undefined}
                      appointmentId={inv.appointmentId || undefined}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <h2 className="mb-3 font-bold text-navy">آخر الاستلامات</h2>
            {recentPayments.length === 0 ? (
              <EmptyState title="لا مدفوعات بعد" />
            ) : (
              <div className="space-y-2">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-2xl border border-border p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-navy">
                        {payment.patientName}
                      </p>
                      <p className="font-latin tabular-nums">
                        {formatCurrencyDZD(payment.amount)}
                      </p>
                    </div>
                    <p className="font-latin text-xs tabular-nums text-muted">
                      {payment.receiptNumber} ·{" "}
                      {formatArabicDate(new Date(payment.paymentDate))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      ) : null}
    </div>
  );
}
