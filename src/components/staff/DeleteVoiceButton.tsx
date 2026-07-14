"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export function DeleteVoiceButton({
  messageId,
  csrfToken,
}: {
  messageId: string;
  csrfToken: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (!window.confirm("حذف الرسالة الصوتية؟")) return;
    setLoading(true);
    const res = await fetch("/api/staff/chat", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ messageId }),
    });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void remove()}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs font-semibold text-danger hover:underline disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
      حذف الرسالة الصوتية
    </button>
  );
}
