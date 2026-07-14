import { redirect } from "next/navigation";

/** الصفحات الفرعية أُلغيت — لوحة الطبيب المبسّطة فقط */
export default function SpecialistAppointmentsRedirect() {
  redirect("/doctor/specialist/dashboard");
}
