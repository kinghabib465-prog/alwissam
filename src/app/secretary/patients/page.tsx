import { redirect } from "next/navigation";

export default function SecretaryPatientsRedirect() {
  redirect("/secretary/dashboard?tab=intake");
}
