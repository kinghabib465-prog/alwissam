import { redirect } from "next/navigation";

export default function SecretaryTodayRedirect() {
  redirect("/secretary/dashboard?tab=today");
}
