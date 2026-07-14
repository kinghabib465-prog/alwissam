"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** يمرّر إلى الفاتورة المحددة من رابط ?invoice= */
export function PaymentHighlight() {
  const invoice = useSearchParams().get("invoice");

  useEffect(() => {
    if (!invoice) return;
    const el = document.getElementById(`invoice-${invoice}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.classList.add("ring-2", "ring-teal", "rounded-2xl");
  }, [invoice]);

  return null;
}
