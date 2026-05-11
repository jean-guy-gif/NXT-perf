"use client";

import { usePathname } from "next/navigation";
import { DirecteurHeader } from "@/components/directeur/directeur-header";

/**
 * Shell Client pour la rubrique Directeur.
 * Décide d'afficher ou non le DirecteurHeader (breadcrumb + scope + period)
 * selon la route courante.
 *
 * Routes EXCLUES (pas de header transverse) :
 * - /directeur/pilotage-financier : indicateurs agence-only
 * - /directeur/leads-dpi       : ré-export /admin/dpi, pas de scope applicable
 */
const HIDE_HEADER_ON: string[] = [
  "/directeur/pilotage-financier",
  "/directeur/leads-dpi",
];

export function DirecteurShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showHeader = !HIDE_HEADER_ON.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  return (
    <>
      {showHeader && <DirecteurHeader />}
      {children}
    </>
  );
}
