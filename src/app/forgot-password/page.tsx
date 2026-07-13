"use client";

import { useState } from "react";
import Link from "next/link";
import { ClinicLogo } from "@/components/branding/ClinicLogo";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [devToken, setDevToken] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setDevToken("");
    const res = await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    const data = await res.json();
    setMessage(data.message || data.error || "");
    if (data.devToken) setDevToken(data.devToken);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={onSubmit} className="card-surface w-full max-w-md space-y-4 p-6">
        <ClinicLogo />
        <h1 className="text-2xl font-bold text-navy">استعادة كلمة المرور</h1>
        <FormField label="البريد أو الهاتف">
          <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        </FormField>
        {message && <p className="text-sm text-success">{message}</p>}
        {devToken && (
          <p className="break-all text-xs text-muted">
            رمز التطوير: {devToken} —{" "}
            <Link className="text-blue" href={`/reset-password?token=${devToken}`}>
              تعيين كلمة مرور
            </Link>
          </p>
        )}
        <Button type="submit" loading={loading} className="w-full">
          إرسال رابط الاستعادة
        </Button>
      </form>
    </div>
  );
}
