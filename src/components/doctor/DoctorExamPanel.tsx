"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Form";
import { splitPatientName } from "@/lib/patient-name";

/** معاينة بسيطة — التكلفة + ملاحظة؛ الموعد من السكرتير */
export function DoctorExamPanel({
  entryId,
  fullName,
  status,
  csrfToken,
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
}) {
  const router = useRouter();
  const { firstName, lastName } = splitPatientName(fullName);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(status === "WITH_DOCTOR");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [covered, setCovered] = useState(false);
  const [error, setError] = useState("");

  const done = status === "SESSION_DONE" || status === "LEFT";

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

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3">
        <p className="text-lg font-bold text-navy">
          {firstName}
          {lastName ? (
            <span className="mr-2 font-semibold text-teal">{lastName}</span>
          ) : null}
        </p>
        <Button size="sm" variant="teal" loading={loading} onClick={openExam}>
          معاينة
        </Button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-2">
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
