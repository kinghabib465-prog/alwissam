import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** موافقات التقويم أُزيلت من الواجهة */
export default function OrthodonticsRemoved() {
  redirect("/doctor/specialist/dashboard");
}
