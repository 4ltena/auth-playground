import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { DeleteAccountForm } from "./delete-form";

export default async function DeleteAccountPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?next=/account/delete");

  return (
    <main className="shell-narrow mx-auto py-20">
      <h1 className="font-bold tracking-tight text-3xl mb-8">退会</h1>
      <DeleteAccountForm />
    </main>
  );
}
