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
        hideOnRoutes={[
          "/manager/equipe",
          "/manager/gps",
          "/manager/notifications",
          // PR3.8.2 — Manager V3 routes use the inline <ManagerViewSwitcher>
          // instead of this legacy banner.
          "/manager/diagnostic",
          "/manager/ameliorer",
          "/manager/progression",
          "/manager/comparaison",
        ]}
      />
      {children}
    </>
  );
}
