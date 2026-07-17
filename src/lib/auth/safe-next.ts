/** مسار داخلي آمن بعد الدخول — يمنع open redirect */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return fallback;
  }
  if (value.includes("\\") || value.includes("\0")) return fallback;
  return value;
}
