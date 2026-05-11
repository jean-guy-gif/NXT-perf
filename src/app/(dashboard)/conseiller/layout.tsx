"use client";

import { useAppStore, DEFAULT_ROUTES } from "@/stores/app-store";
import { redirect } from "next/navigation";
import { MethodBreadcrumb } from "@/components/conseiller/layout/method-breadcrumb";
import { PersistentPlanBanner } from "@/components/conseiller/layout/persistent-plan-banner";
import { TeamPlanBanner } from "@/components/conseiller/layout/team-plan-banner";
import { FloatingCopilote } from "@/components/conseiller/layout/floating-copilote";
import { useDpiSnapshotEnsure } from "@/hooks/use-dpi-snapshot-ensure";

export default function ConseillerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAppStore((s) => s.user);
  const roles = user?.availableRoles ?? [];
  // Trigger client-side : assure 1 snapshot DPI par mois en DB.
  useDpiSnapshotEnsure(user?.id ?? null);

  // Bootstrap : if user not loaded yet, render children (avoids flash redirect)
  if (user && !roles.includes("conseiller")) {
    redirect(DEFAULT_ROUTES[user.mainRole] ?? "/dashboard");
  }

  return (
    <>
      <MethodBreadcrumb />
      <PersistentPlanBanner />
      <TeamPlanBanner />
      {children}
      <FloatingCopilote />
    </>
  );
}
