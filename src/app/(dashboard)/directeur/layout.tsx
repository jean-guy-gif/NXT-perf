"use client";

import { useAppStore } from "@/stores/app-store";
import { redirect } from "next/navigation";
import { DirecteurShell } from "./_directeur-shell";

export default function DirecteurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAppStore((s) => s.user);
  const roles = user?.availableRoles ?? [];

  // Autorise le rôle "reseau" en plus de "directeur" pour préserver l'accès
  // aux Leads DPI (ancienne URL /admin/dpi redirigée vers /directeur/leads-dpi).
  if (!roles.includes("directeur") && !roles.includes("reseau")) {
    redirect("/dashboard");
  }

  return <DirecteurShell>{children}</DirecteurShell>;
}
