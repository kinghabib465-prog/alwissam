import { redirect } from "next/navigation";

export default function SecretaryAppointmentsRedirect() {
  redirect("/secretary/dashboard?tab=intake");
}
