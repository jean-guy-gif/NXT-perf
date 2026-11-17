"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { isManagerLocked } from "@/lib/app-mode";
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

  const content = (
    <>
      <ManagerScopeBanner
        hideOnRoutes={[
          "/manager/equipe",
          "/manager/gps",
          "/manager/notifications",
          "/manager/diagnostic",
          "/manager/ameliorer",
          "/manager/progression",
          "/manager/comparaison",
        ]}
      />
      {children}
    </>
  );

  // Mode formation : espace manager verrouillé (flou + cadenas), sans rien
  // supprimer. Le contenu réel reste rendu derrière un flou inerte, et une
  // carte centrée renvoie le stagiaire vers son propre tableau de bord.
  if (isManagerLocked()) {
    return <ManagerLockedShell>{content}</ManagerLockedShell>;
  }

  return content;
}

function ManagerLockedShell({ children }: { children: React.ReactNode }) {
  const backRef = useRef<HTMLAnchorElement>(null);

  // Accessibilité : le focus va sur le bouton « Retour » à l'ouverture.
  useEffect(() => {
    backRef.current?.focus();
  }, []);

  return (
    <div className="relative min-h-[70vh]">
      {/* Contenu réel, flouté et inerte (non supprimé). */}
      <div className="blur-sm pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {/* Carte de verrouillage, centrée, accessible au clavier. */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Espace manager verrouillé"
          className="w-full max-w-md rounded-2xl border border-border bg-card/85 p-6 text-center shadow-xl backdrop-blur-sm"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Espace manager</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Disponible prochainement. Pendant la formation, on travaille ton
            tableau de bord conseiller.
          </p>
          <Link
            ref={backRef}
            href="/conseiller/diagnostic"
            className="mt-5 inline-flex items-center justify-center rounded-[var(--radius-button)] bg-agency-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-agency-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-agency-primary focus-visible:ring-offset-2"
          >
            Retour à mon tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
