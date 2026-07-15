import { redirect } from "next/navigation";

export default function SecretaryCalendarRedirect() {
  redirect("/secretary/dashboard?tab=today");
}
