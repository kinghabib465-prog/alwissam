import { redirect } from "next/navigation";

export default function SecretaryDirectedRedirect() {
  redirect("/secretary/dashboard?tab=waiting");
}
