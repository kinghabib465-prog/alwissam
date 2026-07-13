"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ClinicLogo } from "@/components/branding/ClinicLogo";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";
import { Suspense } from "react";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/password-reset", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "فشل التحديث");
    } else {
      setMessage(data.message);
      setTimeout(() => router.push("/staff/login"), 1200);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="card-surface w-full max-w-md space-y-4 p-6">
      <ClinicLogo />
      <h1 className="text-2xl font-bold text-navy">تعيين كلمة مرور جديدة</h1>
      <FormField label="رمز الاستعادة">
        <Input value={token} onChange={(e) => setToken(e.target.value)} required />
      </FormField>
      <FormField label="كلمة المرور الجديدة">
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </FormField>
      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-success">{message}</p>}
      <Button type="submit" loading={loading} className="w-full">
        حفظ
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense>
        <ResetForm />
      </Suspense>
    </div>
  );
}
