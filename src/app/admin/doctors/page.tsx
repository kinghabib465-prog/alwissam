import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

/** توجيه قديم — إدارة الأطباء من لوحة صاحبة العيادة */
export default async function AdminDoctorsRedirect() {
  await requireUser(["ADMIN", "DOCTOR_SPECIALIST"]);
  redirect("/doctor/specialist/doctors");
}
