import { redirect } from "next/navigation";

/** واجهة المريض صفحة واحدة فقط */
export default function Page() {
  redirect("/patient/dashboard");
}
