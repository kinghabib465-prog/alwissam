/**
 * Runs on Next.js server boot (Render-friendly: no Shell / no Prisma seed CLI).
 * Creates staff accounts even if Start Command is only `next start`.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  try {
    const { ensureStaff } = await import("../scripts/ensure-staff.mjs");
    await ensureStaff();
  } catch (err) {
    console.error("[instrumentation] ensure-staff failed:", err);
  }
}
