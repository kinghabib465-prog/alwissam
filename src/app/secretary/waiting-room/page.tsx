import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

/** قاعة الانتظار أصبحت «الموجهون» */
export default async function WaitingRoomRedirect() {
  await requireUser(["SECRETARY", "ADMIN"]);
  redirect("/secretary/directed");
}
