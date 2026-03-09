"use client";

import { useAppStore } from "@/stores/app-store";
import { redirect } from "next/navigation";

export default function ReseauLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAppStore((s) => s.user);
  const roles = user?.availableRoles ?? [];

  if (!roles.includes("reseau")) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
