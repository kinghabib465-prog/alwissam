import { redirect } from "next/navigation";

export default function GeneralAppointmentsRedirect() {
  redirect("/doctor/general/dashboard");
}
