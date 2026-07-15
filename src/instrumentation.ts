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

  try {
    const { repairMananaDoctorDuplicates } = await import(
      "@/lib/resolve-clinic-doctors"
    );
    const result = await repairMananaDoctorDuplicates();
    if (result.migrated || result.deactivated) {
      console.log("[instrumentation] Manana doctor repair:", result);
    }
  } catch (err) {
    console.error("[instrumentation] Manana repair failed:", err);
  }
}