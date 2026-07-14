"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";
import { splitPatientName } from "@/lib/patient-name";
import { PrintCredentials } from "@/components/patient/PrintCredentials";
import {
  PatientAccountPanel,
  PatientQrCode,
} from "@/components/patient/PatientQrCode";
import { toLatinDigits } from "@/lib/latin-digits";
import type { DoctorAvailability } from "@/lib/doctor-availability";
import { nextWorkingYmd } from "@/lib/doctor-availability";
import { AppointmentDatePicker } from "@/components/doctor/AppointmentDatePicker";
import { patientQrLoginUrl } from "@/lib/patient-qr";
import { formatCurrencyDZD } from "@/lib/utils";

export type PatientPaymentRow = {
  id: string;
  amount: number;
  dateLabel: string;
  method: string;
  receiptNumber: string;
  invoiceNumber: string;
};

export type PatientRowData = {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  age?: number | null;
  city?: string | null;
  allergies?: string | null;
  patientType?: string | null;
  hasAccount?: boolean;
  accountLogin?: string | null;
  qrUrl?: string | null;
  statusLabel: string;
  statusTone: "success" | "warning" | "muted" | "teal" | "danger";
  paidLabel: string;
  paidTone: "success" | "warning" | "muted" | "danger";
  sessionsCount: number;
  nextLabel?: string | null;
  nextAppointmentId?: string | null;
  nextAtIso?: string | null;
  lastNote?: string | null;
  finance?: {
    totalBilled: number;
    totalPaid: number;
    remaining: number;
    payments: PatientPaymentRow[];
  };
};

type Panel = "none" | "schedule" | "edit" | "account" | "finance";

/** قائمة مرضاي — إدارة منظمة بدون إرهاق الطبيب */
export function DoctorPatientCard({
  patient,
  csrfToken,
  canManage,
  availability,
}: {
  patient: PatientRowData;
  csrfToken: string;
  canManage?: boolean;
  availability?: DoctorAvailability | null;
  generalAvailability?: DoctorAvailability | null;
}) {
  const router = useRouter();
  const { firstName, lastName } = splitPatientName(patient.fullName);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [creds, setCreds] = useState<{
    login: string;
    password: string;
    qrUrl?: string;
  } | null>(null);
  const [info, setInfo] = useState({
    fullName: patient.fullName,
    phone: patient.phone || "",
    email: patient.email || "",
    age: patient.age != null ? String(patient.age) : "",
    city: patient.city || "",
    allergies: patient.allergies || "",
  });
  const [accountForm, setAccountForm] = useState({
    email: patient.email || "",
    phone: patient.phone || "",
    newPassword: "",
  });
  const [apptType, setApptType] = useState("ORTHO_FOLLOWUP");

  const defaultDate = useMemo(() => {
    if (!availability) return "";
    return nextWorkingYmd(availability.workDays, 0);
  }, [availability]);

  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const finance = patient.finance;

  function togglePanel(next: Panel) {
    setPanel((p) => (p === next ? "none" : next));
    setError("");
    setOk("");
  }

  async function api(url: string, method: string, body: object) {
    setLoading(true);
    setError("");
    setOk("");
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشلت العملية");
      return null;
    }
    return data;
  }

  async function saveSchedule(editExisting: boolean) {
    if (!selectedDate) {
      setError("اختر يوم موعد من أيام عملك");
      return;
    }
    const body =
      editExisting && patient.nextAppointmentId
        ? {
            appointmentId: patient.nextAppointmentId,
            date: selectedDate,
          }
        : {
            patientId: patient.id,
            date: selectedDate,
            appointmentType: apptType,
          };

    const data = await api(
      "/api/doctor/schedule-appointment",
      editExisting && patient.nextAppointmentId ? "PATCH" : "POST",
      body,
    );
    if (!data) return;
    setOk(editExisting ? "تم تعديل يوم الموعد" : "تم حجز الموعد لليوم المحدد");
    setPanel("none");
    router.refresh();
  }

  async function saveInfo() {
    const data = await api("/api/doctor/patient", "PATCH", {
      section: "info",
      patientId: patient.id,
      ...info,
    });
    if (!data) return;
    setOk("تم حفظ بيانات المريض");
    router.refresh();
  }

  async function createAccount() {
    const data = await api("/api/doctor/create-patient-account", "POST", {
      patientId: patient.id,
      nextSessionDays: 14,
    });
    if (!data) return;
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL;
    setCreds({
      login: data.credentials.login,
      password: data.credentials.password,
      qrUrl: data.qrAccessToken
        ? patientQrLoginUrl(data.qrAccessToken, origin)
        : undefined,
    });
    setOpen(true);
    setOk("تم إنشاء الحساب — اطبع أو سلّم للمريض");
    router.refresh();
  }

  async function saveAccount() {
    const data = await api("/api/doctor/patient", "PATCH", {
      section: "account",
      patientId: patient.id,
      ...accountForm,
    });
    if (!data) return;
    setOk("تم تعديل الحساب");
    setAccountForm((f) => ({ ...f, newPassword: "" }));
    router.refresh();
  }

  async function deactivateAccount() {
    if (!confirm("تعطيل حساب دخول المريض؟ (يبقى في القائمة)")) return;
    const data = await api("/api/doctor/patient", "DELETE", {
      patientId: patient.id,
      scope: "account",
    });
    if (!data) return;
    setOk("تم تعطيل الحساب");
    setCreds(null);
    setPanel("none");
    router.refresh();
  }

  async function deletePatient() {
    if (
      !confirm(
        "حذف المريض من قائمتك؟ سيتم تعطيل حسابه أيضاً إن وُجد. لا يمكن التراجع بسهولة.",
      )
    ) {
      return;
    }
    const data = await api("/api/doctor/patient", "DELETE", {
      patientId: patient.id,
      scope: "patient",
    });
    if (!data) return;
    setOk("تم حذف المريض");
    router.refresh();
  }

  async function printQr() {
    const qrUrl = creds?.qrUrl || patient.qrUrl;
    if (!qrUrl) return;
    let dataUrl = "";
    try {
      dataUrl = await QRCode.toDataURL(qrUrl, {
        width: 220,
        margin: 1,
        color: { dark: "#0B1F33", light: "#FFFFFF" },
      });
    } catch {
      setError("تعذّرت طباعة الرمز");
      return;
    }
    const win = window.open("", "_blank", "width=420,height=640");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head>
      <meta charset="utf-8"/>
      <title>QR — ${patient.fullName}</title>
      <style>
        body{font-family:Tahoma,Arial,sans-serif;padding:28px;text-align:center;color:#0B1F33}
        h1{font-size:16px;margin:0 0 4px}
        .clinic{color:#0F9A9A;font-weight:bold;margin-bottom:12px}
        .hint{font-size:12px;color:#64748b;margin-top:12px}
        img{display:block;margin:16px auto}
        @media print{body{padding:12px}}
      </style>
    </head><body>
      <p class="clinic">عيادة الوسام لطب الأسنان</p>
      <h1>${patient.fullName}</h1>
      <p class="hint">امسح الرمز للدخول إلى حسابك</p>
      <img src="${dataUrl}" width="220" height="220" alt="QR"/>
      <script>window.onload=function(){window.print();}</script>
    </body></html>`);
    win.document.close();
  }

  const paidToneClass =
    patient.paidTone === "danger"
      ? "text-danger"
      : patient.paidTone === "success"
        ? "text-teal"
        : "text-muted";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      {/* صف مضغوط */}
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-right transition hover:bg-[#F8FBFC]"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-navy">
            {firstName}
            {lastName ? (
              <span className="mr-2 font-semibold text-teal">{lastName}</span>
            ) : null}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted">
            {patient.nextLabel ? (
              <span>
                الموعد:{" "}
                <span className="font-semibold text-teal">
                  {toLatinDigits(patient.nextLabel)}
                </span>
              </span>
            ) : (
              <span>بدون موعد</span>
            )}
            <span aria-hidden>·</span>
            <span>
              حصص{" "}
              <span className="font-latin font-semibold">
                {toLatinDigits(patient.sessionsCount)}
              </span>
            </span>
            {finance && finance.totalPaid > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span className={paidToneClass}>
                  دفع {formatCurrencyDZD(finance.totalPaid)}
                </span>
              </>
            ) : patient.paidLabel === "لم يدفع" ||
              patient.paidLabel === "متبقي" ? (
              <>
                <span aria-hidden>·</span>
                <span className="text-danger">{patient.paidLabel}</span>
              </>
            ) : null}
          </p>
        </div>
        <span className="shrink-0 rounded-xl bg-soft-teal px-3 py-1.5 text-xs font-bold text-teal">
          {open ? "إخفاء" : "إدارة"}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-border bg-[#F8FBFC]/40 px-4 py-4">
          {/* 1 — البيانات */}
          <section className="rounded-xl border border-border/80 bg-white p-3">
            <p className="mb-2 text-xs font-bold tracking-wide text-muted">
              بيانات المريض
            </p>
            <div className="grid gap-1.5 text-sm sm:grid-cols-2">
              <p>
                الهاتف:{" "}
                <span className="font-latin font-semibold">
                  {toLatinDigits(patient.phone || "—")}
                </span>
              </p>
              {patient.age != null && (
                <p>
                  العمر:{" "}
                  <span className="font-latin">
                    {toLatinDigits(patient.age)}
                  </span>
                </p>
              )}
              {patient.city && <p>المدينة: {patient.city}</p>}
              {patient.email && (
                <p className="sm:col-span-2">
                  البريد:{" "}
                  <span className="font-latin">{patient.email}</span>
                </p>
              )}
              {patient.allergies && (
                <p className="sm:col-span-2 text-danger">
                  حساسية: {patient.allergies}
                </p>
              )}
              <p className="sm:col-span-2">
                الموعد القادم:{" "}
                <span className="font-semibold text-teal">
                  {patient.nextLabel
                    ? toLatinDigits(patient.nextLabel)
                    : "غير محدد"}
                </span>
              </p>
            </div>
          </section>

          {/* 2 — التكاليف */}
          <section className="rounded-xl border border-border/80 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-bold tracking-wide text-muted">
                التكاليف منذ بداية العلاج
              </p>
              {finance && finance.payments.length > 0 ? (
                <button
                  type="button"
                  className="text-xs font-bold text-teal hover:underline"
                  onClick={() => togglePanel("finance")}
                >
                  {panel === "finance" ? "إخفاء التفاصيل" : "عرض الدفعات"}
                </button>
              ) : null}
            </div>
            {finance && (finance.totalBilled > 0 || finance.totalPaid > 0) ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-[#F0F7F8] px-2 py-2">
                  <p className="text-[10px] text-muted">الإجمالي</p>
                  <p className="mt-0.5 text-sm font-bold text-navy font-latin">
                    {formatCurrencyDZD(finance.totalBilled)}
                  </p>
                </div>
                <div className="rounded-lg bg-soft-teal/40 px-2 py-2">
                  <p className="text-[10px] text-muted">مدفوع</p>
                  <p className="mt-0.5 text-sm font-bold text-teal font-latin">
                    {formatCurrencyDZD(finance.totalPaid)}
                  </p>
                </div>
                <div
                  className={`rounded-lg px-2 py-2 ${
                    finance.remaining > 0
                      ? "bg-red-50"
                      : "bg-[#F0F7F8]"
                  }`}
                >
                  <p className="text-[10px] text-muted">المتبقي</p>
                  <p
                    className={`mt-0.5 text-sm font-bold font-latin ${
                      finance.remaining > 0 ? "text-danger" : "text-navy"
                    }`}
                  >
                    {formatCurrencyDZD(finance.remaining)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">لا فواتير مسجّلة بعد</p>
            )}

            {panel === "finance" && finance && finance.payments.length > 0 && (
              <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto border-t border-border pt-3">
                {finance.payments.map((pay) => (
                  <li
                    key={pay.id}
                    className="flex items-start justify-between gap-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-navy">
                        {toLatinDigits(pay.dateLabel)}
                      </p>
                      <p className="text-xs text-muted">
                        {pay.method}
                        {pay.receiptNumber
                          ? ` · ${toLatinDigits(pay.receiptNumber)}`
                          : ""}
                      </p>
                    </div>
                    <p className="shrink-0 font-latin font-bold text-teal">
                      {formatCurrencyDZD(pay.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 3 — الحساب و QR */}
          {(patient.hasAccount && patient.qrUrl) || creds ? (
            <section>
              {patient.hasAccount && patient.qrUrl && !creds ? (
                <PatientAccountPanel
                  login={patient.accountLogin || patient.phone}
                  qrUrl={patient.qrUrl}
                  nextLabel={patient.nextLabel}
                  sessionsCount={patient.sessionsCount}
                />
              ) : null}
              {creds && (
                <PrintCredentials
                  patientName={patient.fullName}
                  login={creds.login}
                  password={creds.password}
                  qrUrl={creds.qrUrl}
                  nextLabel={patient.nextLabel}
                  sessionsCount={patient.sessionsCount}
                />
              )}
              {(patient.qrUrl || creds?.qrUrl) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={printQr}>
                    طباعة QR
                  </Button>
                </div>
              )}
            </section>
          ) : null}

          {/* شريط إجراءات منظم */}
          {canManage && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button
                size="sm"
                className={
                  panel === "schedule"
                    ? "bg-teal hover:bg-[#0c8282]"
                    : "bg-teal/15 text-teal hover:bg-teal/25"
                }
                onClick={() => togglePanel("schedule")}
              >
                موعد
              </Button>
              <Button
                size="sm"
                className={
                  panel === "account"
                    ? "bg-violet-600 hover:bg-violet-700"
                    : "bg-violet-100 text-violet-900 hover:bg-violet-200"
                }
                onClick={() => togglePanel("account")}
              >
                {patient.hasAccount ? "الحساب" : "إنشاء حساب"}
              </Button>
              <Button
                size="sm"
                className={
                  panel === "edit"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                }
                onClick={() => togglePanel("edit")}
              >
                تعديل
              </Button>
              <Button
                size="sm"
                variant="danger"
                loading={loading}
                onClick={deletePatient}
              >
                حذف
              </Button>
            </div>
          )}

          {canManage && panel === "schedule" && (
            <div className="space-y-3 rounded-xl border border-teal/30 bg-soft-teal/15 p-3">
              <p className="text-sm font-bold text-navy">حجز موعد — يوم فقط</p>
              {availability && availability.workDays.length > 0 ? (
                <AppointmentDatePicker
                  availability={availability}
                  date={selectedDate || defaultDate}
                  onDateChange={setSelectedDate}
                  dayOnly
                />
              ) : (
                <p className="text-sm text-danger">
                  حدّد أيام عملك من الإعدادات أولاً
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {[
                  ["ORTHO_FOLLOWUP", "متابعة تقويم"],
                  ["GENERAL_EXAM", "فحص"],
                  ["POST_OP_FOLLOWUP", "بعد عملية"],
                  ["OTHER", "أخرى"],
                ].map(([code, label]) => (
                  <Button
                    key={code}
                    size="sm"
                    variant={apptType === code ? "teal" : "outline"}
                    onClick={() => setApptType(code)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="teal"
                  loading={loading}
                  disabled={!availability?.workDays.length}
                  onClick={() => saveSchedule(false)}
                >
                  حجز لهذا اليوم
                </Button>
                {patient.nextAppointmentId && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={loading}
                    disabled={!availability?.workDays.length}
                    onClick={() => saveSchedule(true)}
                  >
                    تعديل يوم الموعد
                  </Button>
                )}
              </div>
            </div>
          )}

          {canManage && panel === "edit" && (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <FormField label="الاسم الكامل">
                <Input
                  value={info.fullName}
                  onChange={(e) =>
                    setInfo({ ...info, fullName: e.target.value })
                  }
                />
              </FormField>
              <FormField label="الهاتف">
                <Input
                  className="font-latin"
                  value={info.phone}
                  onChange={(e) =>
                    setInfo({ ...info, phone: e.target.value })
                  }
                />
              </FormField>
              <div className="grid gap-2 sm:grid-cols-2">
                <FormField label="العمر">
                  <Input
                    className="font-latin"
                    value={info.age}
                    onChange={(e) =>
                      setInfo({ ...info, age: e.target.value })
                    }
                  />
                </FormField>
                <FormField label="المدينة">
                  <Input
                    value={info.city}
                    onChange={(e) =>
                      setInfo({ ...info, city: e.target.value })
                    }
                  />
                </FormField>
              </div>
              <FormField label="البريد">
                <Input
                  className="font-latin"
                  value={info.email}
                  onChange={(e) =>
                    setInfo({ ...info, email: e.target.value })
                  }
                />
              </FormField>
              <FormField label="حساسية">
                <Input
                  value={info.allergies}
                  onChange={(e) =>
                    setInfo({ ...info, allergies: e.target.value })
                  }
                />
              </FormField>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600"
                loading={loading}
                onClick={saveInfo}
              >
                حفظ البيانات
              </Button>
            </div>
          )}

          {canManage && panel === "account" && (
            <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
              {!patient.hasAccount ? (
                <div className="space-y-2">
                  <p className="text-sm text-navy">
                    إنشاء حساب دخول للمريض مع رمز QR للمسح المباشر.
                  </p>
                  <Button
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-700"
                    loading={loading}
                    onClick={createAccount}
                  >
                    إنشاء حساب + QR
                  </Button>
                </div>
              ) : (
                <>
                  {patient.qrUrl && (
                    <div className="flex justify-center sm:hidden">
                      <PatientQrCode url={patient.qrUrl} size={120} />
                    </div>
                  )}
                  <FormField label="بريد / معرف الدخول">
                    <Input
                      className="font-latin"
                      value={accountForm.email}
                      onChange={(e) =>
                        setAccountForm({
                          ...accountForm,
                          email: e.target.value,
                        })
                      }
                    />
                  </FormField>
                  <FormField label="كلمة سر جديدة (اختياري)">
                    <Input
                      type="password"
                      value={accountForm.newPassword}
                      onChange={(e) =>
                        setAccountForm({
                          ...accountForm,
                          newPassword: e.target.value,
                        })
                      }
                    />
                  </FormField>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-700"
                      loading={loading}
                      onClick={saveAccount}
                    >
                      حفظ الحساب
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={printQr}
                      disabled={!patient.qrUrl}
                    >
                      طباعة QR
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={loading}
                      onClick={deactivateAccount}
                    >
                      تعطيل الحساب
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {error && <p className="text-sm font-semibold text-danger">{error}</p>}
          {ok && <p className="text-sm font-semibold text-teal">{ok}</p>}
        </div>
      )}
    </div>
  );
}
