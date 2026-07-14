import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function AdminSettingsRedirect() {
  await requireUser(["ADMIN", "DOCTOR_SPECIALIST"]);
  redirect("/doctor/specialist/settings");
}
