import { redirect } from "next/navigation";

/** الإعدادات أصبحت قائمة منسدلة — الافتراضي: تواصل معنا */
export default function SettingsIndexPage() {
  redirect("/doctor/specialist/settings/contact");
}
