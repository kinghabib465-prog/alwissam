"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";
import { splitPatientName } from "@/lib/patient-name";
import { PrintCredentials } from "@/components/patient/PrintCredentials";
import { PatientQrCode } from "@/components/patient/PatientQrCode";
import { toLatinDigits } from "@/lib/latin-digits";
import type { DoctorAvailability } from "@/lib/doctor-availability";
import { nextWorkingYmd } from "@/lib/doctor-availability";
import { AppointmentDatePicker } from "@/components/doctor/AppointmentDatePicker";
import { patientQrLoginUrl } from "@/lib/patient-qr";
import { formatCurrencyDZD } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ChevronDown, CalendarDays, UserRound, Wallet, QrCode } from "lucide-react";

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
  chronicIllnesses?: string | null;
  visitReason?: string | null;
  isFirstVisit?: boolean | null;
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

type TabKey = "overview" | "schedule" | "account" | "edit";

const TABS: { key: TabKey; label: string; icon: typeof CalendarDays }[] = [
  { key: "overview", label: "نظرة عامة", icon: Wallet },
  { key: "schedule", label: "موعد", icon: CalendarDays },
  { key: "account", label: "حساب / QR", icon: QrCode },
  { key: "edit", label: "بيانات", icon: UserRound },
];

/** إدارة مريض واحدة — تبويب واحد في كل مرة، بدون تكدّس نوافذ */
export function DoctorPatientCard({
  patient,
  csrfToken,
  canManage,
  availability,
  expanded,
  onExpandedChange,
}: {
  patient: PatientRowData;
  csrfToken: string;
  canManage?: boolean;
  availability?: DoctorAvailability | null;
  generalAvailability?: DoctorAvailability | null;
  /** فتح مراقب من القائمة — مريض واحد فقط لتقليل التشويش */
  expanded?: boolean;
  onExpandedChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const { firstName, lastName } = splitPatientName(patient.fullName);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = expanded ?? internalOpen;
  const setOpen = onExpandedChange ?? setInternalOpen;
  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [showPayments, setShowPayments] = useState(false);
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

  function openManage() {
    setOpen(true);
    setTab("overview");
    setError("");
    setOk("");
  }

  function togglePanel() {
    if (open) {
      setOpen(false);
    } else {
      openManage();
    }
  }

  function switchTab(next: TabKey) {
    setTab(next);
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
        ? { appointmentId: patient.nextAppointmentId, date: selectedDate }
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
    setOk(editExisting ? "تم تعديل يوم الموعد" : "تم حجز الموعد");
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
    setCreds({
      login: data.credentials.login,
      password: data.credentials.password,
      qrUrl:
        data.qrUrl ||
        (data.qrAccessToken
          ? patientQrLoginUrl(data.qrAccessToken, window.location.origin)
          : undefined),
    });
    setOk("تم إنشاء الحساب — اطبع الورقة أو سلّمها للمريض");
    setTab("account");
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
    if (!confirm("تعطيل حساب دخول المريض؟")) return;
    const data = await api("/api/doctor/patient", "DELETE", {
      patientId: patient.id,
      scope: "account",
    });
    if (!data) return;
    setOk("تم تعطيل الحساب");
    setCreds(null);
    router.refresh();
  }

  async function deletePatient() {
    if (!confirm("حذف المريض من قائمتك؟ سيتم تعطيل حسابه أيضاً إن وُجد.")) {
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
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-white transition",
        open ? "border-teal/35 shadow-md" : "border-border shadow-sm",
      )}
    >
      {/* صف مضغوط — نظرة سريعة فقط */}
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3.5 text-right transition hover:bg-[#F8FBFC]"
        onClick={togglePanel}
        aria-expanded={open}
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
            <span className="font-latin">
              {toLatinDigits(patient.sessionsCount)} حصص
            </span>
            {finance && finance.remaining > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span className="text-danger">
                  متبقي {formatCurrencyDZD(finance.remaining)}
                </span>
              </>
            ) : finance && finance.totalPaid > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span className={paidToneClass}>
                  دفع {formatCurrencyDZD(finance.totalPaid)}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition",
            open ? "bg-navy text-white" : "bg-soft-teal text-teal",
          )}
        >
          {open ? "إغلاق" : "إدارة"}
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition", open && "rotate-180")}
          />
        </span>
      </button>

      {open && (
        <div className="border-t border-border">
          {/* تبويبات — قسم واحد فقط يظهر */}
          {canManage ? (
            <div
              className="flex gap-1 overflow-x-auto border-b border-border bg-[#F5F8FB] px-2 py-2"
              role="tablist"
            >
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => switchTab(t.key)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition",
                      active
                        ? "bg-white text-navy shadow-sm ring-1 ring-border"
                        : "text-muted hover:bg-white/70 hover:text-navy",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="space-y-3 px-4 py-4">
            {(error || ok) && (
              <p
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-semibold",
                  error ? "bg-red-50 text-danger" : "bg-soft-teal/40 text-teal",
                )}
              >
                {error || ok}
              </p>
            )}

            {/* —— نظرة عامة —— */}
            {tab === "overview" && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted">الهاتف</dt>
                      <dd className="font-latin font-semibold text-navy">
                        {toLatinDigits(patient.phone || "—")}
                      </dd>
                    </div>
                    {patient.age != null && (
                      <div>
                        <dt className="text-xs text-muted">العمر</dt>
                        <dd className="font-latin text-navy">
                          {toLatinDigits(patient.age)}
                        </dd>
                      </div>
                    )}
                    {patient.city && (
                      <div>
                        <dt className="text-xs text-muted">السكن</dt>
                        <dd className="text-navy">{patient.city}</dd>
                      </div>
                    )}
                    {patient.visitReason && (
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-muted">سبب الزيارة</dt>
                        <dd className="font-semibold text-navy">
                          {patient.visitReason}
                        </dd>
                      </div>
                    )}
                    {patient.isFirstVisit != null && (
                      <div>
                        <dt className="text-xs text-muted">أول زيارة</dt>
                        <dd className="text-navy">
                          {patient.isFirstVisit ? "نعم" : "لا — مريض سابق"}
                        </dd>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-muted">الموعد القادم</dt>
                      <dd className="font-semibold text-teal">
                        {patient.nextLabel
                          ? toLatinDigits(patient.nextLabel)
                          : "غير محدد"}
                      </dd>
                    </div>
                    {patient.chronicIllnesses && (
                      <div className="sm:col-span-2 rounded-xl bg-red-50 px-3 py-2 text-danger">
                        مرض يعاني منه: {patient.chronicIllnesses}
                      </div>
                    )}
                    {patient.allergies && (
                      <div className="sm:col-span-2 rounded-xl bg-red-50 px-3 py-2 text-danger">
                        حساسية: {patient.allergies}
                      </div>
                    )}
                  </dl>

                  {(patient.qrUrl || creds?.qrUrl) && (
                    <div className="mx-auto flex flex-col items-center gap-1 sm:mx-0">
                      <PatientQrCode
                        url={(creds?.qrUrl || patient.qrUrl)!}
                        size={112}
                      />
                      <Button size="sm" variant="outline" onClick={printQr}>
                        طباعة QR
                      </Button>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-[#F8FBFC] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold text-muted">التكاليف</p>
                    {finance && finance.payments.length > 0 ? (
                      <button
                        type="button"
                        className="text-xs font-bold text-teal hover:underline"
                        onClick={() => setShowPayments((v) => !v)}
                      >
                        {showPayments ? "إخفاء الدفعات" : "سجل الدفعات"}
                      </button>
                    ) : null}
                  </div>
                  {finance && (finance.totalBilled > 0 || finance.totalPaid > 0) ? (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-muted">الإجمالي</p>
                        <p className="font-latin text-sm font-bold text-navy">
                          {formatCurrencyDZD(finance.totalBilled)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted">مدفوع</p>
                        <p className="font-latin text-sm font-bold text-teal">
                          {formatCurrencyDZD(finance.totalPaid)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted">المتبقي</p>
                        <p
                          className={cn(
                            "font-latin text-sm font-bold",
                            finance.remaining > 0 ? "text-danger" : "text-navy",
                          )}
                        >
                          {formatCurrencyDZD(finance.remaining)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">لا فواتير بعد</p>
                  )}

                  {showPayments && finance && finance.payments.length > 0 && (
                    <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto border-t border-border pt-3">
                      {finance.payments.map((pay) => (
                        <li
                          key={pay.id}
                          className="flex justify-between gap-2 text-sm"
                        >
                          <span className="text-muted">
                            {toLatinDigits(pay.dateLabel)} · {pay.method}
                          </span>
                          <span className="font-latin font-bold text-teal">
                            {formatCurrencyDZD(pay.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {canManage && (
                  <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                    <Button
                      size="sm"
                      variant="teal"
                      onClick={() => switchTab("schedule")}
                    >
                      حجز / تعديل موعد
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => switchTab("account")}
                    >
                      {patient.hasAccount ? "الحساب و QR" : "إنشاء حساب"}
                    </Button>
                    <button
                      type="button"
                      className="mr-auto text-xs text-danger hover:underline"
                      onClick={deletePatient}
                    >
                      حذف من قائمتي
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* —— موعد —— */}
            {tab === "schedule" && canManage && (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  اختر يوماً من أيام دوامك فقط — بدون ساعة
                </p>
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
                      تعديل يوم الموعد الحالي
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* —— حساب —— */}
            {tab === "account" && canManage && (
              <div className="space-y-3">
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

                {!patient.hasAccount && !creds ? (
                  <div className="space-y-2 rounded-xl border border-border bg-[#F8FBFC] p-4">
                    <p className="text-sm text-navy">
                      إنشاء حساب دخول مع رمز QR للمسح المباشر إلى لوحة المريض.
                    </p>
                    <Button
                      size="sm"
                      variant="teal"
                      loading={loading}
                      onClick={createAccount}
                    >
                      إنشاء حساب + QR
                    </Button>
                  </div>
                ) : (
                  <>
                    {(patient.qrUrl || creds?.qrUrl) && (
                      <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start">
                        <PatientQrCode
                          url={(creds?.qrUrl || patient.qrUrl)!}
                          size={132}
                        />
                        <div className="space-y-2 text-sm">
                          <p className="font-semibold text-navy">
                            الدخول:{" "}
                            <span className="font-latin">
                              {toLatinDigits(
                                creds?.login ||
                                  patient.accountLogin ||
                                  patient.phone,
                              )}
                            </span>
                          </p>
                          <Button size="sm" variant="outline" onClick={printQr}>
                            طباعة بطاقة QR
                          </Button>
                        </div>
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
                        variant="teal"
                        loading={loading}
                        onClick={saveAccount}
                      >
                        حفظ الحساب
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

            {/* —— تعديل بيانات —— */}
            {tab === "edit" && canManage && (
              <div className="space-y-2">
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
                <Button size="sm" variant="teal" loading={loading} onClick={saveInfo}>
                  حفظ البيانات
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
