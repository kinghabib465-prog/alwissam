"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** تحديث قائمة الاستقبال تلقائياً عند وصول مسجّلين جدد */
export function SecretaryAutoRefresh({ seconds = 8 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
