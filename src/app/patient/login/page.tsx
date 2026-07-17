"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";
import { safeInternalPath } from "@/lib/auth/safe-next";

function PatientLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() =>
    searchParams.get("error") === "qr"
      ? "رمز QR غير صالح أو منتهٍ — سجّل الدخول بالبريد/الهاتف أو اطلب رمزًا جديدًا من العيادة"
      : "",
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, portal: "patient" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "فشل تسجيل الدخول");
        return;
      }
      const destination = safeInternalPath(
        searchParams.get("next"),
        data.redirectTo || "/patient/dashboard",
      );
      router.push(destination);
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="بوابة المرضى"
      title="تسجيل دخول المريض"
      description="للمرضى الذين فعّل الطبيب حساباتهم لمتابعة المواعيد والعلاج."
      alternateHref="/staff/login"
      alternateLabel="الانتقال إلى دخول الطاقم"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="البريد أو الهاتف" htmlFor="identifier">
          <Input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            inputMode="email"
            placeholder="البريد الإلكتروني أو رقم الهاتف"
            required
          />
        </FormField>
        <FormField label="كلمة المرور" htmlFor="password">
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
          />
        </FormField>
        <div className="flex flex-wrap justify-between gap-3 text-sm">
          <Link
            href="/activate-account"
            className="font-semibold text-blue hover:text-teal"
          >
            تفعيل الحساب
          </Link>
          <Link
            href="/forgot-password?portal=patient"
            className="font-semibold text-blue hover:text-teal"
          >
            نسيت كلمة المرور؟
          </Link>
        </div>
        {error && (
          <p
            className="rounded-xl bg-[#FDECEE] px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" loading={loading}>
          تسجيل الدخول
        </Button>
      </form>
    </AuthPageShell>
  );
}

export default function PatientLoginPage() {
  return (
    <Suspense fallback={null}>
      <PatientLoginForm />
    </Suspense>
  );
}
