"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";

export default function ActivateAccountPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    try {
      const res = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "فشل تفعيل الحساب");
        return;
      }
      router.replace("/patient/login");
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="بوابة المرضى"
      title="تفعيل حساب المريض"
      description="أدخل رمز التفعيل الذي استلمته من العيادة، ثم أنشئ كلمة مرور آمنة."
      alternateHref="/patient/login"
      alternateLabel="لديك حساب؟ تسجيل الدخول"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="رمز التفعيل" htmlFor="token">
          <Input
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="one-time-code"
            required
          />
        </FormField>
        <FormField label="كلمة المرور" htmlFor="password">
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
        <Button type="submit" loading={loading} className="w-full">
          تفعيل الحساب
        </Button>
      </form>
    </AuthPageShell>
  );
}
