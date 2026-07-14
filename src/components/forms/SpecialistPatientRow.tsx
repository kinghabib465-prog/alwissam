"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

import { PrintCredentials } from "@/components/patient/PrintCredentials";

type Creds = {
  login: string;
  email: string;
  phone: string | null;
  password: string;
};

export function SpecialistPatientRow({
  patientId,
  hasAccount,
  csrfToken,
}: {
  patientId: string;
  hasAccount: boolean;
  csrfToken: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creds, setCreds] = useState<Creds | null>(null);
  const [patientName, setPatientName] = useState("");

  async function createAccount() {
    setLoading(true);
    setError("");
    setCreds(null);
    try {
      const res = await fetch("/api/doctor/create-patient-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ patientId, nextSessionDays: 14 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "فشل إنشاء الحساب");
        return;
      }
      setCreds(data.credentials);
      setPatientName(data.patientName || "");
      router.refresh();
    } catch {
      setError("تعذر الاتصال");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {!hasAccount && !creds ? (
          <Button size="sm" variant="teal" loading={loading} onClick={createAccount}>
            إنشاء حساب فوري
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled>
            الحساب موجود
          </Button>
        )}
        <Link href={`/patients/${patientId}`}>
          <Button size="sm" variant="secondary">
            عرض المعلومات
          </Button>
        </Link>
      </div>

      {creds && (
        <PrintCredentials
          patientName={patientName || "المريض"}
          login={creds.login}
          password={creds.password}
        />
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
