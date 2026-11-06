"use client";

import { useAppStore } from "@/stores/app-store";
import { redirect } from "next/navigation";
import { isFormationMode } from "@/lib/app-mode";

export default function ReseauLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAppStore((s) => s.user);
  const roles = user?.availableRoles ?? [];

  // Mode formation : le rôle réseau est masqué.
  if (isFormationMode() || !roles.includes("reseau")) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
