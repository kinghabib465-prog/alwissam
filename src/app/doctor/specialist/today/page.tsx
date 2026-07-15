import { redirect } from "next/navigation";

/** لوحة اليوم دُمجت داخل المعاينة — غرفة واحدة ليوم العمل */
export default function SpecialistTodayRedirect() {
  redirect("/doctor/specialist/dashboard");
}
