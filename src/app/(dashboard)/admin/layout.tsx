import { redirect } from "next/navigation";
import { isFormationMode } from "@/lib/app-mode";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Mode formation : l'espace admin est masqué.
  if (isFormationMode()) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
