"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toLatinDigits } from "@/lib/latin-digits";

/** QR لدخول المريض المباشر إلى حسابه */
export function PatientQrCode({
  url,
  size = 160,
}: {
  url: string;
  size?: number;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: { dark: "#0B1F33", light: "#FFFFFF" },
    })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {
        if (!cancelled) setDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  if (!dataUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-border bg-white text-xs text-muted"
        style={{ width: size, height: size }}
      >
        جاري QR...
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt="رمز دخول المريض"
      width={size}
      height={size}
      className="rounded-xl border border-border bg-white p-1"
    />
  );
}

export function PatientAccountPanel({
  login,
  qrUrl,
  nextLabel,
  sessionsCount,
  password,
}: {
  login: string;
  qrUrl: string;
  nextLabel?: string | null;
  sessionsCount: number;
  password?: string | null;
}) {
  return (
    <div className="mt-3 grid gap-3 rounded-2xl border-2 border-violet-200 bg-violet-50/60 p-3 sm:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-1">
        <PatientQrCode url={qrUrl} size={148} />
        <p className="text-center text-[11px] text-muted">
          امسح للدخول المباشر
        </p>
      </div>
      <div className="space-y-2 text-sm">
        <p className="font-bold text-navy">حساب المريض</p>
        <p>
          الدخول:{" "}
          <span className="font-latin font-semibold" data-numeric="true">
            {toLatinDigits(login)}
          </span>
        </p>
        {password ? (
          <p>
            كلمة السر:{" "}
            <span className="font-latin font-semibold">{password}</span>
          </p>
        ) : null}
        <p>
          الموعد القادم:{" "}
          <span className="font-semibold text-teal">
            {nextLabel ? toLatinDigits(nextLabel) : "غير محدد"}
          </span>
        </p>
        <p>
          عدد الحصص:{" "}
          <span className="font-latin font-bold text-navy">
            {toLatinDigits(sessionsCount)}
          </span>
        </p>
        <p className="text-xs text-muted break-all" dir="ltr">
          {qrUrl}
        </p>
      </div>
    </div>
  );
}
