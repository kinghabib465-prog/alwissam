import { randomBytes } from "crypto";
import type { NextRequest } from "next/server";

export function generateQrAccessToken() {
  return randomBytes(24).toString("hex");
}

export function patientQrLoginPath(token: string) {
  return `/patient/qr/${token}`;
}

function isLocalHost(url: string) {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/**
 * Prefer public production URL — never bake localhost into printed patient QR codes.
 */
export function getAppOrigin(hint?: string | null) {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.RENDER_EXTERNAL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    hint,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const cleaned = raw.replace(/\/$/, "");
    if (!cleaned) continue;
    if (isLocalHost(cleaned)) continue;
    if (/^https?:\/\//i.test(cleaned)) return cleaned;
    return `https://${cleaned}`;
  }

  const envLocal = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (envLocal) return envLocal;
  if (hint && !isLocalHost(hint)) return hint.replace(/\/$/, "");
  return "http://localhost:3000";
}

/** Origin the browser should see (avoids Render internal localhost:10000). */
export function resolveRequestOrigin(req: NextRequest) {
  const protoHeader = req.headers.get("x-forwarded-proto");
  const hostHeader =
    req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = protoHeader?.split(",")[0]?.trim();
  const host = hostHeader?.split(",")[0]?.trim();

  let forwarded: string | null = null;
  if (proto && host && !isLocalHost(host)) {
    forwarded = `${proto}://${host}`;
  } else if (host && !isLocalHost(host)) {
    forwarded = `https://${host}`;
  }

  try {
    const fromUrl = new URL(req.url).origin;
    if (!isLocalHost(fromUrl)) {
      return getAppOrigin(forwarded || fromUrl);
    }
  } catch {
    // ignore
  }

  return getAppOrigin(forwarded);
}

export function publicAppUrl(pathname: string, req?: NextRequest) {
  const origin = req ? resolveRequestOrigin(req) : getAppOrigin();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${path}`;
}

export function patientQrLoginUrl(token: string, origin?: string | null) {
  const base = getAppOrigin(origin);
  return `${base}${patientQrLoginPath(token)}`;
}
