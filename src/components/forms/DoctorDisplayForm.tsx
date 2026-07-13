"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Form";

export function DoctorDisplayForm({
  csrfToken,
  doctorId,
  name,
  specialtyAr,
  bioAr,
}: {
  csrfToken: string;
  doctorId: string;
  name: string;
  specialtyAr: string;
  bioAr: string;
}) {
  const router = useRouter();
  const [specialty, setSpecialty] = useState(specialtyAr);
  const [bio, setBio] = useState(bioAr);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/admin/clinic-settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        section: "doctor_profile",
        doctorId,
        specialtyAr: specialty,
        bioAr: bio,
      }),
    });
    setLoading(false);
    setMsg(res.ok ? "تم الحفظ" : "فشل");
    if (res.ok) router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="font-bold text-navy">{name}</p>
      <div className="mt-3 space-y-3">
        <FormField label="التخصص / العرض">
          <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
        </FormField>
        <FormField label="الوصف">
          <Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </FormField>
        <Button size="sm" variant="teal" loading={loading} onClick={save}>
          حفظ وصف الطبيب
        </Button>
        {msg && <p className="text-xs text-teal">{msg}</p>}
      </div>
    </div>
  );
}
