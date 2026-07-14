"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { PatientQrCode } from "@/components/patient/PatientQrCode";
import { toLatinDigits } from "@/lib/latin-digits";

export function PrintCredentials({
  patientName,
  login,
  password,
  qrUrl,
  nextLabel,
  sessionsCount,
}: {
  patientName: string;
  login: string;
  password: string;
  qrUrl?: string | null;
  nextLabel?: string | null;
  sessionsCount?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function print() {
    const content = ref.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank", "width=480,height=720");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head>
      <meta charset="utf-8"/>
      <title>بيانات الدخول — ${patientName}</title>
      <style>
        body { font-family: Tahoma, Arial, sans-serif; padding: 24px; color: #0B1F33; }
        h1 { font-size: 18px; margin: 0 0 8px; }
        .box { border: 2px solid #0F9A9A; border-radius: 12px; padding: 16px; margin-top: 16px; }
        .label { font-size: 12px; color: #64748b; margin-bottom: 4px; }
        .value { font-size: 18px; font-weight: bold; letter-spacing: 0.5px; direction: ltr; text-align: right; }
        .clinic { color: #0F9A9A; font-weight: bold; }
        img { display: block; margin: 12px auto; }
        @media print { button { display: none; } }
      </style>
    </head><body>${content}
      <script>window.onload=function(){window.print();}</script>
    </body></html>`);
    win.document.close();
  }

  return (
    <div className="rounded-2xl border border-teal bg-soft-teal/40 p-4">
      <p className="font-bold text-navy">تم إنشاء الحساب — سلّم للمريض أو اطبع</p>
      <div ref={ref} className="mt-3 space-y-2 text-sm">
        <p className="clinic text-teal">عيادة الوسام لطب الأسنان</p>
        <h1 className="text-base font-bold text-navy">{patientName}</h1>
        <div className="box space-y-3 rounded-xl border border-teal/40 bg-white p-3">
          {qrUrl ? (
            <div className="flex justify-center">
              <PatientQrCode url={qrUrl} size={140} />
            </div>
          ) : null}
          <div>
            <p className="label text-xs text-muted">رقم / معرف الدخول</p>
            <p className="value font-latin text-lg font-bold">
              {toLatinDigits(login)}
            </p>
          </div>
          <div>
            <p className="label text-xs text-muted">كلمة السر</p>
            <p className="value font-latin text-lg font-bold">{password}</p>
          </div>
          {nextLabel ? (
            <p className="text-xs">
              الموعد القادم:{" "}
              <strong>{toLatinDigits(nextLabel)}</strong>
            </p>
          ) : null}
          {sessionsCount != null ? (
            <p className="text-xs">
              عدد الحصص:{" "}
              <strong className="font-latin">
                {toLatinDigits(sessionsCount)}
              </strong>
            </p>
          ) : null}
          <p className="text-xs text-muted">
            امسح QR للدخول المباشر · أو /patient/login
          </p>
        </div>
      </div>
      <Button size="sm" variant="teal" className="mt-3" onClick={print}>
        طباعة مع QR
      </Button>
    </div>
  );
}
