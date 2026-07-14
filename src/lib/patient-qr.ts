import { randomBytes } from "crypto";

export function generateQrAccessToken() {
  return randomBytes(24).toString("hex");
}

export function patientQrLoginPath(token: string) {
  return `/patient/qr/${token}`;
}

export function patientQrLoginUrl(token: string, origin?: string) {
  const base =
    origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${patientQrLoginPath(token)}`;
}
