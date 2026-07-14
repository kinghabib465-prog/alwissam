"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClinicLogo } from "@/components/branding/ClinicLogo";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";

export default function StaffLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        body: JSON.stringify({ identifier, password, rememberMe, portal: "staff" }),
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="login-hero relative hidden items-center justify-center p-10 text-white lg:flex">
        <div className="max-w-md">
          <ClinicLogo light href="/" />
          <h1 className="mt-8 text-3xl font-bold">بوابة الطاقم الطبي</h1>
          <p className="mt-3 text-white/80">
            دخول السكرتارية والأطباء وصاحبة العيادة.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-background px-4 py-10">
        <form
          onSubmit={onSubmit}
          className="card-surface w-full max-w-md space-y-4 p-6 sm:p-8"
        >
          <div className="lg:hidden">
            <ClinicLogo />
          </div>
          <h2 className="text-2xl font-bold text-navy">تسجيل دخول الطاقم</h2>
          <FormField label="البريد أو الهاتف" htmlFor="identifier">
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
          </FormField>
          <FormField label="كلمة المرور" htmlFor="password">
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "إخفاء" : "إظهار"}
              </button>
            </div>
          </FormField>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              تذكرني
            </label>
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
    </div>
  );
}
