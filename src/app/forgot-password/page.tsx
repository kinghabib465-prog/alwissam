"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const portal = searchParams.get("portal") === "patient" ? "patient" : "staff";
  const loginHref = portal === "patient" ? "/patient/login" : "/staff/login";
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devToken, setDevToken] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    setDevToken("");
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "تعذر إرسال طلب الاستعادة");
        return;
      }
      setMessage(
        data.message || "إذا كان الحساب موجوداً سيتم إرسال رابط الاستعادة",
      );
      if (data.devToken) setDevToken(data.devToken);
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow="أمان الحساب"
      title="استعادة كلمة المرور"
      description="أدخل البريد أو رقم الهاتف المرتبط بالحساب. لن نكشف إن كان الحساب مسجلاً أم لا."
      alternateHref={loginHref}
      alternateLabel="العودة إلى تسجيل الدخول"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="البريد أو الهاتف" htmlFor="identifier">
          <Input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            placeholder="البريد الإلكتروني أو رقم الهاتف"
            required
          />
        </FormField>
        {message && (
          <p
            className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-success"
            role="status"
          >
            {message}
          </p>
        )}
        {error && (
          <p
            className="rounded-xl bg-[#FDECEE] px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {error}
          </p>
        )}
        {devToken && (
          <p className="break-all text-xs text-muted">
            رمز التطوير: {devToken} —{" "}
            <Link
              className="font-semibold text-blue"
              href={`/reset-password?token=${devToken}&portal=${portal}`}
            >
              تعيين كلمة مرور
            </Link>
          </p>
        )}
        <Button type="submit" loading={loading} className="w-full">
          إرسال رابط الاستعادة
        </Button>
      </form>
    </AuthPageShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
