"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Form";

const CONFIRM_PHRASE = "مسح كل المرضى";

export function WipePatientsPanel({ csrfToken }: { csrfToken: string }) {
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function wipe() {
    if (confirmation !== CONFIRM_PHRASE) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/wipe-patients", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ confirmation }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذر المسح");
        return;
      }
      setSuccess(data.message || "تم المسح");
      setConfirmation("");
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-danger/40 bg-danger/5 p-4">
      <h2 className="font-bold text-danger">مسح كل المرضى والبيانات</h2>
      <p className="text-sm leading-6 text-foreground">
        يحذف نهائياً: كل المرضى، التسجيلات، المواعيد، الانتظار، الفواتير،
        الدفعات، الملفات الطبية، والتقويم.{" "}
        <strong>يُبقي حسابات منانة والأطباء والسكرتارية وإعدادات العيادة.</strong>
      </p>
      <FormField
        label={`للتأكيد اكتبي: ${CONFIRM_PHRASE}`}
        htmlFor="wipe-all-confirm"
      >
        <Input
          id="wipe-all-confirm"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="off"
          placeholder={CONFIRM_PHRASE}
        />
      </FormField>
      <Button
        type="button"
        variant="danger"
        loading={loading}
        disabled={confirmation !== CONFIRM_PHRASE}
        onClick={wipe}
      >
        مسح كل المرضى الآن
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm font-semibold text-teal">
          {success}
        </p>
      )}
    </div>
  );
}
