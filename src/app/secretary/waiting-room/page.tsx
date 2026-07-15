import { redirect } from "next/navigation";

export default function SecretaryWaitingRoomRedirect() {
  redirect("/secretary/dashboard?tab=waiting");
}
