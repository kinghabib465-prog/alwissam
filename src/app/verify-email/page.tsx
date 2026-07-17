"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Button } from "@/components/ui/Button";

function VerifyEmailForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("جاري تأكيد البريد...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("رابط التأكيد غير مكتمل");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/email-change", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error || "فشل تأكيد البريد");
          return;
        }
        setStatus("ok");
        setMessage(data.message || "تم تأكيد البريد بنجاح");
        window.setTimeout(() => router.replace("/staff/login"), 1600);
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("تعذر الاتصال بالخادم");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <AuthPageShell
      eyebrow="أمان الحساب"
      title="تأكيد البريد الإلكتروني"
      description="نتحقق من رابط التأكيد الذي وصلك على البريد الجديد."
      alternateHref="/staff/login"
      alternateLabel="العودة إلى تسجيل الدخول"
    >
      <div className="space-y-4 text-center">
        <p
          className={
            status === "error"
              ? "rounded-xl bg-[#FDECEE] px-3 py-3 text-sm text-danger"
              : status === "ok"
                ? "rounded-xl bg-emerald-50 px-3 py-3 text-sm text-success"
                : "text-sm text-muted"
          }
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
        {status === "error" && (
          <Button
            className="w-full"
            variant="outline"
            onClick={() => router.push("/staff/login")}
          >
            تسجيل الدخول
          </Button>
        )}
      </div>
    </AuthPageShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
