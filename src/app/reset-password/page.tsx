"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";
import { Suspense } from "react";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const portal = params.get("portal") === "patient" ? "patient" : "staff";
  const loginHref = portal === "patient" ? "/patient/login" : "/staff/login";
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "فشل تحديث كلمة المرور");
        return;
      }
      setMessage(data.message || "تم تحديث كلمة المرور");
      window.setTimeout(() => router.replace(loginHref), 900);
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="أمان الحساب"
      title="تعيين كلمة مرور جديدة"
      description="استخدم كلمة مرور من 8 أحرف على الأقل ولا تشاركها مع أي شخص."
      alternateHref={loginHref}
      alternateLabel="العودة إلى تسجيل الدخول"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="رمز الاستعادة" htmlFor="token">
          <Input
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="one-time-code"
            required
          />
        </FormField>
        <FormField label="كلمة المرور الجديدة" htmlFor="password">
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            minLength={8}
          />
        </FormField>
        <FormField label="تأكيد كلمة المرور" htmlFor="confirmPassword">
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            minLength={8}
          />
        </FormField>
        {error && (
          <p
            className="rounded-xl bg-[#FDECEE] px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-success"
            role="status"
          >
            {message}
          </p>
        )}
        <Button type="submit" loading={loading} className="w-full">
          حفظ كلمة المرور
        </Button>
      </form>
    </AuthPageShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
