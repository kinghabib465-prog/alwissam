import type { getCurrentUser } from "@/lib/auth/current-user";

export function isClinicOwner(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
) {
  return (
    user.role.code === "ADMIN" ||
    (user.role.code === "DOCTOR_SPECIALIST" &&
      !!user.doctor &&
      user.doctor.type === "SPECIALIST")
  );
}
