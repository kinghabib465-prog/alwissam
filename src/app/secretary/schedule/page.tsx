import { redirect } from "next/navigation";

export default function SecretaryScheduleRedirect() {
  redirect("/secretary/dashboard?tab=today");
}
