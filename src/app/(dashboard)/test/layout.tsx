import { redirect } from "next/navigation";
import { isFormationMode } from "@/lib/app-mode";

export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Mode formation : les pages de test sont masquées.
  if (isFormationMode()) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
