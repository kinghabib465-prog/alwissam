import { redirect } from "next/navigation";

export default async function SecretaryPaymentsRedirect({
  searchParams,
}: {
  searchParams?: Promise<{ invoice?: string }>;
}) {
  const sp = (await searchParams) || {};
  const q = sp.invoice
    ? `?tab=pay&invoice=${encodeURIComponent(sp.invoice)}`
    : "?tab=pay";
  redirect(`/secretary/dashboard${q}`);
}
