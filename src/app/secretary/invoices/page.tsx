import { redirect } from "next/navigation";

export default function SecretaryInvoicesRedirect() {
  redirect("/secretary/dashboard?tab=pay");
}
