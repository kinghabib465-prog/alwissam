"use client";

import { useEffect } from "react";
import { toLatinDigits } from "@/lib/latin-digits";

const EASTERN = /[٠-٩۰-۹]/;

function convertNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue;
    if (text && EASTERN.test(text)) {
      node.nodeValue = toLatinDigits(text);
    }
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  const tag = el.tagName;
  if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return;

  // قيم الحقول والقوائم
  if (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    tag === "OPTION"
  ) {
    const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (input.value && EASTERN.test(input.value)) {
      input.value = toLatinDigits(input.value);
    }
    if (
      "placeholder" in input &&
      input.placeholder &&
      EASTERN.test(input.placeholder)
    ) {
      input.placeholder = toLatinDigits(input.placeholder);
    }
  }

  for (const child of Array.from(el.childNodes)) {
    convertNode(child);
  }
}

/** يحوّل أي رقم عربي/فارسي يظهر في الصفحة إلى 0-9 غربي */
export function ForceLatinDigits() {
  useEffect(() => {
    convertNode(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "characterData" && m.target) {
          convertNode(m.target);
        }
        m.addedNodes.forEach((n) => convertNode(n));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const onInput = (e: Event) => {
      const t = e.target as HTMLInputElement | null;
      if (!t || !("value" in t) || !t.value) return;
      if (!EASTERN.test(t.value)) return;
      const start = t.selectionStart;
      const next = toLatinDigits(t.value);
      if (next === t.value) return;
      t.value = next;
      // مزامنة React للحقول المتحكم بها
      const tracker = (
        t as unknown as { _valueTracker?: { setValue: (v: string) => void } }
      )._valueTracker;
      tracker?.setValue?.("");
      t.dispatchEvent(new Event("input", { bubbles: true }));
      if (start != null) {
        try {
          t.setSelectionRange(start, start);
        } catch {
          /* ignore */
        }
      }
    };

    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
    };
  }, []);

  return null;
}
