"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClinicLogo } from "@/components/branding/ClinicLogo";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";

export default function ActivateAccountPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "فشل التفعيل");
      setLoading(false);
      return;
    }
    router.push("/patient/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={onSubmit} className="card-surface w-full max-w-md space-y-4 p-6">
        <ClinicLogo />
        <h1 className="text-2xl font-bold text-navy">تفعيل حساب المريض</h1>
        <p className="text-sm text-muted">
          أدخل رمز التفعيل المرسل إليك بعد موافقة الطبيب، ثم أنشئ كلمة المرور.
        </p>
        <FormField label="رمز التفعيل">
          <Input value={token} onChange={(e) => setToken(e.target.value)} required />
        </FormField>
        <FormField label="كلمة المرور">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </FormField>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          تفعيل الحساب
        </Button>
      </form>
    </div>
  );
}
