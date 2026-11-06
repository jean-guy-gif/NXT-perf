import { redirect } from "next/navigation";
import { isFormationMode } from "@/lib/app-mode";

export default function SouscrireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Mode formation : pas de souscription.
  if (isFormationMode()) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
