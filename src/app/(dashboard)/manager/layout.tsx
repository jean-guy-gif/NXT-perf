"use client";

import { useAppStore } from "@/stores/app-store";
import { redirect } from "next/navigation";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAppStore((s) => s.user);

  if (user?.role !== "manager" && user?.role !== "directeur") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
