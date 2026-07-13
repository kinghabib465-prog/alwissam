"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function DeleteDoctorButton({
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

  async function onDelete() {
    if (!confirm(`حذف حساب الطبيب: ${name}؟`)) return;
    setLoading(true);
    await fetch("/api/admin/doctors", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ userId }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button size="sm" variant="danger" loading={loading} onClick={onDelete}>
      حذف الحساب
    </Button>
  );
}
