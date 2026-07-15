"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Form";
import { splitPatientName } from "@/lib/patient-name";
import { toLatinDigits } from "@/lib/latin-digits";

export type ExamPatientInfo = {
  phone?: string | null;
  age?: number | null;
  city?: string | null;
  chronicIllnesses?: string | null;
  visitReason?: string | null;
  isFirstVisit?: boolean | null;
  receptionNote?: string | null;
};

/** معاينة — تعرض معلومات التسجيل ثم التكلفة والملاحظة */
export function DoctorExamPanel({
  entryId,
  fullName,
  phone,
  status,
  csrfToken,
  patientInfo,
}: {
  entryId: string;
  patientId: string;
  fullName: string;
  phone: string;
  status: string;
  hasAccount: boolean;
  canCreateAccount: boolean;
  csrfToken: string;
  canReferToGeneral?: boolean;
  generalAvailability?: unknown;
  patientInfo?: ExamPatientInfo;
}) {
  const router = useRouter();
  const { firstName, lastName } = splitPatientName(fullName);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(status === "WITH_DOCTOR");
  const [infoOpen, setInfoOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [covered, setCovered] = useState(false);
  const [error, setError] = useState("");

  const done = status === "SESSION_DONE" || status === "LEFT";
  const info = patientInfo || {};
  const displayPhone = info.phone || phone;

  async function openExam() {
    setLoading(true);
    setError("");
    if (status === "WAITING") {
      const res = await fetch("/api/doctor/exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ entryId, action: "start" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setLoading(false);
        setError(data.error || "تعذر بدء المعاينة");
        return;
      }
    }
    setLoading(false);
    setModalOpen(true);
    router.refresh();
  }

  async function completeExam() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/doctor/exam", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        entryId,
        action: "complete",
        amount: covered ? 0 : Number(amount),
        note,
        covered,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "تعذر إنهاء المعاينة");
      return;
    }
    setModalOpen(false);
    router.refresh();
  }

  if (done) return null;

  const infoRows: { label: string; value: string; warn?: boolean }[] = [
    {
      label: "الهاتف",
      value: displayPhone
        ? toLatinDigits(displayPhone)
        : "—",
    },
    {
      label: "العمر",
      value: info.age != null ? toLatinDigits(info.age) : "—",
    },
    {
      label: "السكن",
      value: info.city?.trim() || "—",
    },
    {
      label: "سبب الزيارة",
      value: info.visitReason?.trim() || "—",
    },
    {
      label: "أول زيارة",
      value:
        info.isFirstVisit === true
          ? "نعم"
          : info.isFirstVisit === false
            ? "لا — مريض سابق"
            : "—",
    },
    {
      label: "مرض يعاني منه",
      value: info.chronicIllnesses?.trim() || "لا يوجد",
      warn: !!info.chronicIllnesses?.trim(),
    },
  ];

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            className="min-w-0 flex-1 text-right"
            onClick={() => setInfoOpen((v) => !v)}
          >
            <p className="truncate text-lg font-bold text-navy">
              {firstName}
              {lastName ? (
                <span className="mr-2 font-semibold text-teal">{lastName}</span>
              ) : null}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">
              {info.visitReason
                ? info.visitReason
                : infoOpen
                  ? "إخفاء معلومات التسجيل"
                  : "عرض معلومات التسجيل"}
            </p>
          </button>
          <Button size="sm" variant="teal" loading={loading} onClick={openExam}>
            معاينة
          </Button>
        </div>

        {infoOpen && (
          <dl className="grid gap-2 border-t border-border bg-[#F8FBFC] px-4 py-3 text-sm sm:grid-cols-2">
            {infoRows.map((row) => (
              <div
                key={row.label}
                className={
                  row.warn
                    ? "rounded-xl bg-red-50 px-2.5 py-2 sm:col-span-2"
                    : ""
                }
              >
                <dt className="text-xs text-muted">{row.label}</dt>
                <dd
                  className={
                    row.warn
                      ? "font-semibold text-danger"
                      : "font-semibold text-navy"
                  }
                >
                  {row.value}
                </dd>
              </div>
            ))}
            {info.receptionNote ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted">ملاحظة الاستقبال</dt>
                <dd className="text-navy">{info.receptionNote}</dd>
              </div>
            ) : null}
          </dl>
        )}
        {error && !modalOpen && (
          <p className="border-t border-border px-4 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-2">
              <p className="font-bold text-navy">
                معاينة — {firstName} {lastName}
              </p>
              <button
                type="button"
                className="text-muted hover:text-navy"
                onClick={() => setModalOpen(false)}
              >
                إغلاق
              </button>
            </div>

            <dl className="mb-4 space-y-1.5 rounded-xl bg-[#F8FBFC] px-3 py-3 text-sm">
              {infoRows.map((row) => (
                <div key={row.label} className="flex gap-2">
                  <dt className="shrink-0 text-muted">{row.label}:</dt>
                  <dd
                    className={
                      row.warn
                        ? "font-semibold text-danger"
                        : "font-semibold text-navy"
                    }
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>

            <label className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={covered}
                onChange={(e) => setCovered(e.target.checked)}
              />
              مغطى
            </label>

            {!covered && (
              <FormField label="التكلفة (دج)">
                <Input
                  className="font-latin"
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="2000"
                />
              </FormField>
            )}

            <div className="mt-3">
              <FormField label="ملاحظة للسكرتير">
                <Textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="مثال: يحتاج موعد متابعة"
                />
              </FormField>
            </div>

            {error && <p className="mt-2 text-sm text-danger">{error}</p>}

            <div className="mt-4 flex gap-2">
              <Button
                className="flex-1"
                variant="teal"
                loading={loading}
                onClick={completeExam}
              >
                إرسال للسكرتير
              </Button>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
