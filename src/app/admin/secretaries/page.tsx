import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

/** توجيه قديم — إدارة السكرتارية من لوحة صاحبة العيادة */
export default async function AdminSecretariesRedirect() {
  await requireUser(["ADMIN", "DOCTOR_SPECIALIST"]);
  redirect("/doctor/specialist/secretaries");
}
