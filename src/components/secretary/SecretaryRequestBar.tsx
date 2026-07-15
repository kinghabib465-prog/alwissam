"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Form";
import { splitPatientName } from "@/lib/patient-name";
import { toLatinDigits } from "@/lib/latin-digits";
import {
  VISIT_REASONS,
  initialCustomReason,
  isOtherVisitReason,
  resolveVisitReason,
} from "@/lib/visit-reasons";

type DoctorOpt = { id: string; name: string; type: string };

/** طلب استقبال — تعديل البيانات ثم توجيه / دفع / حذف */
export function SecretaryRequestBar({
  requestId,
  fullName,
  phone,
  age,
  city,
  chronicIllnesses,
  isPreviousPatient,
  appointmentType,
  reason,
  queueOrder,
  doctors,
  csrfToken,
  unpaidInvoiceId,
}: {
  requestId: string;
  fullName: string;
  phone: string;
  age?: number | null;
  city?: string | null;
  chronicIllnesses?: string | null;
  isPreviousPatient?: boolean;
  appointmentType?: string | null;
  reason?: string | null;
  queueOrder: number;
  doctors: DoctorOpt[];
  csrfToken: string;
  unpaidInvoiceId?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openDirect, setOpenDirect] = useState(false);
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({
    fullName,
    phone: phone || "",
    age: age != null ? String(age) : "",
    city: city || "",
    chronicIllnesses: chronicIllnesses || "",
    appointmentType: appointmentType || "GENERAL_EXAM",
    customReason: initialCustomReason(appointmentType, reason),
    isFirstVisit: !isPreviousPatient,
  });

  const { firstName, lastName } = splitPatientName(form.fullName);
  const typeLabel =
    resolveVisitReason(form.appointmentType, form.customReason) ||
    reason ||
    "";

  async function api(action: string, body: object = {}) {
    setLoading(true);
    setError("");
    setOk("");
    const res = await fetch(`/api/secretary/appointments/${requestId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ action, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشلت العملية");
      return null;
    }
    return data;
  }

  async function saveInfo() {
    if (
      isOtherVisitReason(form.appointmentType) &&
      !form.customReason.trim()
    ) {
      setError("اكتب سبب الزيارة عند اختيار «أخرى»");
      return;
    }
    const data = await api("update", {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      age: form.age.trim() === "" ? null : Number(form.age),
      city: form.city,
      chronicIllnesses: form.chronicIllnesses,
      appointmentType: form.appointmentType,
      reason: resolveVisitReason(form.appointmentType, form.customReason),
      isFirstVisit: form.isFirstVisit,
    });
    if (!data) return;
    setOk("تم حفظ البيانات");
    router.refresh();
  }

  async function direct() {
    if (!doctorId) return;
    const data = await api("direct", { doctorId });
    if (!data) return;
    setOpenDirect(false);
    router.push("/secretary/directed");
    router.refresh();
  }

  async function remove() {
    if (!confirm("حذف هذا المريض من الاستقبال؟ (لم يدخل الطبيب)")) return;
    const data = await api("remove");
    if (!data) return;
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-right"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="font-latin flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-soft-teal text-lg font-bold text-teal">
            {toLatinDigits(queueOrder)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-navy">
              {firstName || "—"}
              {lastName ? (
                <span className="mr-2 font-semibold text-teal">{lastName}</span>
              ) : null}
            </p>
            <p className="text-xs text-muted">
              {typeLabel ? `${typeLabel} · ` : ""}
              {open ? "إخفاء التفاصيل" : "تعديل المعلومات · سبب الزيارة"}
            </p>
          </div>
        </button>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="bg-teal hover:bg-[#0c8282]"
            onClick={() => setOpenDirect((v) => !v)}
          >
            توجيه
          </Button>
          <Link
            href={
              unpaidInvoiceId
                ? `/secretary/payments?invoice=${unpaidInvoiceId}`
                : "/secretary/payments"
            }
          >
            <Button size="sm" className="bg-blue hover:bg-[#145a72]">
              دفع
            </Button>
          </Link>
          <Button size="sm" variant="danger" loading={loading} onClick={remove}>
            حذف
          </Button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t border-border bg-[#F8FBFC] px-4 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="الاسم الكامل">
              <Input
                value={form.fullName}
                onChange={(e) =>
                  setForm({ ...form, fullName: e.target.value })
                }
              />
            </FormField>
            <FormField label="رقم الهاتف">
              <Input
                className="font-latin"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </FormField>
            <FormField label="العمر">
              <Input
                className="font-latin"
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
              />
            </FormField>
            <FormField label="السكن">
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="المدينة / البلدية"
              />
            </FormField>
          </div>
          <FormField label="سبب الزيارة">
            <Select
              value={form.appointmentType}
              onChange={(e) =>
                setForm({
                  ...form,
                  appointmentType: e.target.value,
                  customReason:
                    e.target.value === "OTHER" ? form.customReason : "",
                })
              }
            >
              {VISIT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </FormField>
          {isOtherVisitReason(form.appointmentType) && (
            <FormField label="اكتب سبب الزيارة">
              <Input
                value={form.customReason}
                onChange={(e) =>
                  setForm({ ...form, customReason: e.target.value })
                }
                placeholder="مثال: ألم في اللثة، كسر في السن..."
                required
                minLength={2}
              />
            </FormField>
          )}
          <FormField label="مرض تعاني منه">
            <Input
              value={form.chronicIllnesses}
              onChange={(e) =>
                setForm({ ...form, chronicIllnesses: e.target.value })
              }
              placeholder="مثال: سكري، ضغط… أو لا يوجد"
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm font-semibold text-navy">
            <input
              type="checkbox"
              checked={form.isFirstVisit}
              onChange={(e) =>
                setForm({ ...form, isFirstVisit: e.target.checked })
              }
            />
            أول زيارة للعيادة
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="teal" loading={loading} onClick={saveInfo}>
              حفظ المعلومات
            </Button>
            {ok && <span className="text-sm font-semibold text-teal">{ok}</span>}
          </div>
        </div>
      )}

      {openDirect && (
        <div className="flex flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <p className="mb-1 text-xs text-muted">اختر الطبيب</p>
            <Select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.type === "SPECIALIST" ? " — أخصائي" : " — عام"}
                </option>
              ))}
            </Select>
          </div>
          <Button size="sm" variant="teal" loading={loading} onClick={direct}>
            تأكيد التوجيه
          </Button>
        </div>
      )}
      {error && (
        <p className="border-t border-border px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
