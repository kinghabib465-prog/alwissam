import { redirect } from "next/navigation";

/** التسجيل أصبح في الصفحة الرئيسية */
export default function RegisterRedirectPage() {
  redirect("/#register");
}
