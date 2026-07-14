"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PostVisitCheckout } from "@/components/forms/PostVisitCheckout";

export function WaitingRoomActions({
  entryId,
  appointmentId,
  status,
  patientId,
  doctorType,
  hasPatientAccount,
  csrfToken,
}: {
  entryId: string;
  appointmentId: string;
  status: string;
  patientId: string;
  doctorType: "GENERAL" | "SPECIALIST";
  hasPatientAccount: boolean;
  csrfToken: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function update(nextStatus: string) {
    setLoading(true);
    await fetch(`/api/secretary/waiting-room/${entryId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ status: nextStatus }),
    });
    setLoading(false);
    router.refresh();
  }

  if (status === "SESSION_DONE") {
    return (
      <PostVisitCheckout
        entryId={entryId}
        appointmentId={appointmentId}
        patientId={patientId}
        doctorType={doctorType}
        hasPatientAccount={hasPatientAccount}
        csrfToken={csrfToken}
      />
    );
  }

  if (status === "WITH_DOCTOR") {
    return (
      <Button
        size="sm"
        variant="outline"
        loading={loading}
        onClick={() => update("SESSION_DONE")}
      >
        خرج من عند الطبيب
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      loading={loading}
      onClick={() => update("WITH_DOCTOR")}
    >
      دخل عند الطبيب
    </Button>
  );
}
