import { redirect } from "next/navigation";

/** حساب السكرتير يُدار من منانة — لا تعديل ذاتي */
export default function SecretaryAccountRemovedPage() {
  redirect("/secretary/dashboard");
}
