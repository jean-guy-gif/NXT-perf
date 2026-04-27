"use client";

import { useAppStore } from "@/stores/app-store";
import { redirect } from "next/navigation";
import { ManagerScopeBanner } from "@/components/layout/manager-scope-banner";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAppStore((s) => s.user);
  const roles = user?.availableRoles ?? [];

  if (!roles.includes("manager") && !roles.includes("directeur")) {
    redirect("/dashboard");
  }

  return (
    <>
      <ManagerScopeBanner
        hideOnRoutes={["/manager/equipe", "/manager/gps", "/manager/notifications"]}
      />
      {children}
    </>
  );
}
