import { redirect } from "next/navigation";

/** صفحة الأدمن أُلغيت — الصلاحيات لصاحب العيادة الدكتور منانة فؤاد */
export default function AdminRedirectPage() {
  redirect("/doctor/specialist/dashboard");
}
