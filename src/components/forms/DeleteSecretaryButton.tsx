"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function DeleteSecretaryButton({
  userId,
  name,
  csrfToken,
}: {
  userId: string;
  name: string;
  csrfToken: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onDelete() {
    if (!confirm(`حذف حساب السكرتير: ${name}؟`)) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/secretaries", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "فشل الحذف");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="danger" loading={loading} onClick={onDelete}>
        حذف الحساب
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
