"use client";

import { useAppStore } from "@/stores/app-store";
import { redirect } from "next/navigation";

export default function DirecteurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAppStore((s) => s.user);

  if (user?.role !== "directeur") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
