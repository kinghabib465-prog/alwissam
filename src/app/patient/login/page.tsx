"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClinicLogo } from "@/components/branding/ClinicLogo";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";

export default function PatientLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل تسجيل الدخول");
        return;
      }
      router.push(data.redirectTo);
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <form onSubmit={onSubmit} className="card-surface w-full max-w-md space-y-4 p-6 sm:p-8">
        <ClinicLogo />
        <h1 className="text-2xl font-bold text-navy">دخول المريض</h1>
        <p className="text-sm text-muted">
          مخصص للمرضى ذوي العلاج طويل الأمد بعد تفعيل الحساب من الطبيب.
        </p>
        <FormField label="البريد أو الهاتف" htmlFor="identifier">
          <Input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </FormField>
        <FormField label="كلمة المرور" htmlFor="password">
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormField>
        <div className="flex justify-between text-sm">
          <Link href="/activate-account" className="text-blue">
            تفعيل الحساب
          </Link>
          <Link href="/forgot-password" className="text-blue">
            نسيت كلمة المرور؟
          </Link>
        </div>
        {error && (
          <p className="rounded-xl bg-[#FDECEE] px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" loading={loading}>
          دخول
        </Button>
      </form>
    </div>
  );
}
