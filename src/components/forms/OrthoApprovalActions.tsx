"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function OrthoApprovalActions({
  patientId,
  csrfToken,
}: {
  patientId: string;
  csrfToken: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(approve: boolean) {
    setLoading(true);
    await fetch("/api/doctor/ortho-approval", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ patientId, approve }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="teal" loading={loading} onClick={() => act(true)}>
        موافقة بدء التقويم
      </Button>
      <Button size="sm" variant="danger" loading={loading} onClick={() => act(false)}>
        رفض
      </Button>
    </div>
  );
}
