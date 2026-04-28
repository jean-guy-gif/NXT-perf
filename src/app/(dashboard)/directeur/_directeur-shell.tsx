"use client";

import { usePathname } from "next/navigation";
import { ScopeSelector } from "@/components/directeur/scope-selector";

/**
 * Shell Client pour la rubrique Directeur (PR2a).
 * Décide d'afficher ou non le ScopeSelector selon la route courante.
 *
 * Routes EXCLUES (pas de ScopeSelector visible) :
 * - /directeur/pilotage-financier : indicateurs agence-only pour l'instant
 * - /directeur/leads-dpi       : ré-export /admin/dpi, pas de scope applicable
 *
 * Note : le shell laisse passer {children} sans modification — il ajoute juste
 * la barre ScopeSelector au-dessus quand pertinent. Le role-guard reste dans
 * le layout Server parent.
 */
const HIDE_SCOPE_SELECTOR_ON: string[] = [
  "/directeur/pilotage-financier",
  "/directeur/leads-dpi",
];

export function DirecteurShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showScopeSelector = !HIDE_SCOPE_SELECTOR_ON.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  return (
    <>
      {showScopeSelector && <ScopeSelector />}
      {children}
    </>
  );
}
