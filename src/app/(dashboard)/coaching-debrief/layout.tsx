import { redirect } from "next/navigation";
import { isFormationMode } from "@/lib/app-mode";

export default function CoachingDebriefLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Mode formation : le coaching est masqué.
  if (isFormationMode()) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
