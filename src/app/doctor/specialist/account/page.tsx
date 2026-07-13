import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** حساب الأطباء يُدار من صاحبة العيادة */
export default function SpecialistAccountRemoved() {
  redirect("/doctor/specialist/doctors");
}
