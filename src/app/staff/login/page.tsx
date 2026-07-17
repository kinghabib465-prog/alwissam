"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";
import { safeInternalPath } from "@/lib/auth/safe-next";

function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
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
        body: JSON.stringify({
          identifier,
          password,
          rememberMe,
          portal: "staff",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "فشل تسجيل الدخول");
        return;
      }
      const destination = safeInternalPath(
        searchParams.get("next"),
        data.redirectTo || "/staff/login",
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
      eyebrow="بوابة الطاقم"
      title="تسجيل دخول الطاقم"
      description="للأطباء والسكرتارية وصاحبة العيادة. استخدم البريد أو رقم الهاتف المسجّل."
      alternateHref="/patient/login"
      alternateLabel="الانتقال إلى دخول المريض"
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
        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-muted">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 accent-teal"
            />
            تذكرني
          </label>
          <Link
            href="/forgot-password?portal=staff"
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

export default function StaffLoginPage() {
  return (
    <Suspense fallback={null}>
      <StaffLoginForm />
    </Suspense>
  );
}
