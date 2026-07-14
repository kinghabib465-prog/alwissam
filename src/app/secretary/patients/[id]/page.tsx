import { redirect } from "next/navigation";

export default async function SecretaryPatientRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/patients/${id}`);
}
