"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useDirecteurScope, type ScopeType } from "@/hooks/use-directeur-scope";

interface ScopeSelectorProps {
  /**
   * Restriction : par défaut, propose les 3 scopes (agence / équipe / conseiller).
   * Permet de masquer certains scopes sur des pages spécifiques en PR future.
   */
  allowedScopes?: ScopeType[];
}

/**
 * Sélecteur de scope Directeur (PR2a).
 *
 * - Bouton "Agence" pour scope = "agence" (par défaut)
 * - Dropdown "Par équipe…" pour scope = "equipe"
 * - Dropdown "Par conseiller…" pour scope = "conseiller" (groupé par équipe via teamInfos)
 *
 * Le composant écrit le scope choisi dans l'URL (?scope=...&id=...).
 * Il NE filtre PAS les données — le wiring data multi-scope est planifié en PR2c.
 */
export function ScopeSelector({
  allowedScopes = ["agence", "equipe", "conseiller"],
}: ScopeSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { scope: currentScope, scopeId: currentScopeId } = useDirecteurScope();

  const currentUser = useAppStore((s) => s.user);
  const users = useAppStore((s) => s.users);
  const teamInfos = useAppStore((s) => s.teamInfos);

  // Liste des équipes de l'agence du Directeur (institutionId)
  const teams = useMemo(() => {
    if (!currentUser?.institutionId) return teamInfos;
    return teamInfos.filter((t) => t.institutionId === currentUser.institutionId);
  }, [teamInfos, currentUser?.institutionId]);

  // Liste des conseillers de l'agence (groupés par équipe pour l'affichage)
  const conseillers = useMemo(() => {
    return users
      .filter((u) => u.role === "conseiller")
      .filter((u) => !currentUser?.institutionId || u.institutionId === currentUser.institutionId)
      .map((u) => ({
        ...u,
        teamName: teamInfos.find((t) => t.id === u.teamId)?.name ?? "—",
      }))
      .sort((a, b) => {
        const ta = a.teamName.localeCompare(b.teamName);
        if (ta !== 0) return ta;
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
      });
  }, [users, teamInfos, currentUser?.institutionId]);

  function setScope(nextScope: ScopeType, id?: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", nextScope);
    if (id) params.set("id", id);
    else params.delete("id");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/40 px-4 py-3">
      <span className="text-xs font-medium text-muted-foreground mr-1">Scope :</span>

      {allowedScopes.includes("agence") && (
        <button
          type="button"
          onClick={() => setScope("agence")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            currentScope === "agence"
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-foreground hover:bg-muted",
          )}
        >
          <Building2 className="h-3.5 w-3.5" />
          Agence
        </button>
      )}

      {allowedScopes.includes("equipe") && (
        <select
          value={currentScope === "equipe" ? currentScopeId ?? "" : ""}
          onChange={(e) => {
            if (e.target.value) setScope("equipe", e.target.value);
          }}
          className={cn(
            "rounded-md border bg-card px-3 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
            currentScope === "equipe"
              ? "border-primary"
              : "border-border",
          )}
        >
          <option value="">Par équipe…</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}

      {allowedScopes.includes("conseiller") && (
        <select
          value={currentScope === "conseiller" ? currentScopeId ?? "" : ""}
          onChange={(e) => {
            if (e.target.value) setScope("conseiller", e.target.value);
          }}
          className={cn(
            "rounded-md border bg-card px-3 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
            currentScope === "conseiller"
              ? "border-primary"
              : "border-border",
          )}
        >
          <option value="">Par conseiller…</option>
          {conseillers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.teamName !== "—" ? `${u.teamName} — ` : ""}
              {u.firstName} {u.lastName}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
