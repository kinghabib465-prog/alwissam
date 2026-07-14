"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Card";
import { EditDoctorLoginForm } from "@/components/forms/EditDoctorLoginForm";
import { WorkingHoursEditor } from "@/components/forms/WorkingHoursEditor";
import { DeleteDoctorButton } from "@/components/forms/DeleteDoctorButton";

type HourRow = {
  dayOfWeek: string;
  shift: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

export function DoctorStaffBar({
  userId,
  doctorId,
  name,
  email,
  phone,
  specialtyAr,
  type,
  status,
  isOwner,
  canDelete,
  csrfToken,
  defaultShift,
  initialHours,
}: {
  userId: string;
  doctorId: string;
  name: string;
  email: string;
  phone: string;
  specialtyAr: string;
  type: string;
  status: string;
  isOwner: boolean;
  canDelete: boolean;
  csrfToken: string;
  defaultShift: string;
  initialHours: HourRow[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-white">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button
          type="button"
          className="min-w-0 flex-1 text-right"
          onClick={() => setExpanded((v) => !v)}
        >
          <p className="font-semibold text-navy">{name}</p>
          <p className="font-latin text-xs text-muted">
            {email} · {phone}
          </p>
          <p className="mt-1 text-xs text-muted">{specialtyAr}</p>
        </button>
        <StatusBadge
          label={type === "SPECIALIST" ? "أخصائي" : "عام"}
          tone="teal"
        />
        <StatusBadge
          label={status === "ACTIVE" ? "نشط" : "غير نشط"}
          tone={status === "ACTIVE" ? "success" : "muted"}
        />
        {isOwner && <StatusBadge label="صاحبة العيادة" tone="warning" />}
        <Button size="sm" variant="teal" onClick={() => setHoursOpen((v) => !v)}>
          أوقات العمل
        </Button>
        {canDelete && (
          <DeleteDoctorButton
            userId={userId}
            name={name}
            csrfToken={csrfToken}
          />
        )}
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-border px-4 py-3">
          <EditDoctorLoginForm
            userId={userId}
            initialEmail={email}
            initialPhone={phone}
            csrfToken={csrfToken}
          />
          <Link
            href={`/doctor/specialist/staff/${userId}/activity`}
            className="text-xs text-teal hover:underline"
          >
            عرض سجل العمل ←
          </Link>
        </div>
      )}

      {hoursOpen && (
        <div className="border-t border-border px-4 py-3">
          <WorkingHoursEditor
            csrfToken={csrfToken}
            doctorId={doctorId}
            doctorName={name}
            defaultShift={defaultShift}
            initialHours={initialHours}
          />
        </div>
      )}
    </div>
  );
}
