/** Secure cookies on HTTPS hosting platforms unless explicitly disabled. */
export function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    !!process.env.RAILWAY_ENVIRONMENT ||
    !!process.env.RENDER
  );
}
