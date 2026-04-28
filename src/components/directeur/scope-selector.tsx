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

const ALL_TEAM_SENTINEL = "__ALL_TEAM__";

/**
 * Sélecteur de scope Directeur.
 *
 * - Bouton "Agence"          → scope = "agence" (par défaut)
 * - Dropdown "Par équipe…"   → scope = "equipe"
 * - Dropdown "Par conseiller…" → scope = "conseiller"
 *
 * Persistance du contexte équipe : quand on drill-down depuis une équipe vers
 * un conseiller, l'URL conserve `?team=xxx` pour que le dropdown équipe reste
 * sélectionné et que le titre puisse rappeler l'équipe parente.
 *
 * Le composant écrit le scope choisi dans l'URL (?scope=...&id=...&team=...).
 */
export function ScopeSelector({
  allowedScopes = ["agence", "equipe", "conseiller"],
}: ScopeSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { scope: currentScope, scopeId: currentScopeId, teamContext } = useDirecteurScope();

  const currentUser = useAppStore((s) => s.user);
  const users = useAppStore((s) => s.users);
  const teamInfos = useAppStore((s) => s.teamInfos);

  // Liste des équipes de l'agence du Directeur (institutionId).
  // Fallback démo : si `teamInfos` n'est pas alimenté par le store (cas du
  // mode démo qui n'initialise pas teamInfos), on dérive les équipes depuis
  // les `users[].teamId` distincts en lookup le manager pour le label.
  const teams = useMemo(() => {
    const fromInfos = currentUser?.institutionId
      ? teamInfos.filter((t) => t.institutionId === currentUser.institutionId)
      : teamInfos;
    if (fromInfos.length > 0) return fromInfos;

    // Fallback dérivé : map des teamId distincts → { id, name }
    const distinctTeamIds = new Set<string>();
    for (const u of users) {
      if (u.teamId) distinctTeamIds.add(u.teamId);
    }
    return Array.from(distinctTeamIds).map((teamId) => {
      const manager = users.find((u) => u.teamId === teamId && u.role === "manager");
      return {
        id: teamId,
        name: manager
          ? `Équipe de ${manager.firstName}`
          : `Équipe ${teamId}`,
      };
    });
  }, [teamInfos, users, currentUser?.institutionId]);

  // Liste des conseillers — filtrée strictement quand teamContext est actif.
  // Le filtrage est piloté par `teamContext` (et pas seulement scope=equipe)
  // pour que la liste reste filtrée quand on est sur scope=conseiller avec
  // une équipe parente persistante.
  const conseillers = useMemo(() => {
    function resolveTeamName(teamId: string | undefined): string {
      if (!teamId) return "—";
      const fromInfos = teamInfos.find((t) => t.id === teamId)?.name;
      if (fromInfos) return fromInfos;
      const manager = users.find((u) => u.teamId === teamId && u.role === "manager");
      return manager ? `Équipe de ${manager.firstName}` : "—";
    }

    let filtered = users.filter(
      (u) =>
        u.role === "conseiller" &&
        (!currentUser?.institutionId || u.institutionId === currentUser.institutionId),
    );

    if (teamContext) {
      filtered = filtered.filter((u) => u.teamId === teamContext);
    }

    return filtered
      .map((u) => ({
        ...u,
        teamName: resolveTeamName(u.teamId),
      }))
      .sort((a, b) => {
        const ta = a.teamName.localeCompare(b.teamName);
        if (ta !== 0) return ta;
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
      });
  }, [users, teamInfos, currentUser?.institutionId, teamContext]);

  // Helper centralisé : construit l'URL en gardant la cohérence des params.
  function buildScopeUrl(
    scope: ScopeType,
    scopeId: string | null,
    teamCtx: string | null,
  ): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", scope);
    if (scopeId) params.set("id", scopeId);
    else params.delete("id");
    if (scope === "conseiller" && teamCtx) params.set("team", teamCtx);
    else params.delete("team");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function pushScope(scope: ScopeType, scopeId: string | null, teamCtx: string | null) {
    router.push(buildScopeUrl(scope, scopeId, teamCtx), { scroll: false });
  }

  // Valeurs sélectionnées des dropdowns
  const teamSelectValue =
    currentScope === "equipe"
      ? currentScopeId ?? ""
      : currentScope === "conseiller" && teamContext
        ? teamContext
        : "";

  const conseillerSelectValue =
    currentScope === "conseiller" ? currentScopeId ?? "" : "";

  // Le dropdown équipe est "actif" visuellement aussi en scope=conseiller avec contexte
  const teamSelectActive =
    currentScope === "equipe" || (currentScope === "conseiller" && teamContext !== null);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/40 px-4 py-3">
      <span className="text-xs font-medium text-muted-foreground mr-1">Scope :</span>

      {allowedScopes.includes("agence") && (
        <button
          type="button"
          onClick={() => pushScope("agence", null, null)}
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
          value={teamSelectValue}
          onChange={(e) => {
            const teamId = e.target.value;
            if (!teamId) return;
            // Sélection d'une équipe → scope=equipe, reset implicite du conseiller.
            // teamContext = teamId (cohérent avec le hook : scope=equipe ⇒ teamContext === scopeId).
            pushScope("equipe", teamId, teamId);
          }}
          className={cn(
            "rounded-md border bg-card px-3 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
            teamSelectActive ? "border-primary" : "border-border",
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
          value={conseillerSelectValue}
          onChange={(e) => {
            const value = e.target.value;
            if (!value) return;
            if (value === ALL_TEAM_SENTINEL) {
              // Retour vue équipe agrégée — teamContext doit être défini sinon
              // l'option n'est pas visible.
              if (teamContext) pushScope("equipe", teamContext, teamContext);
              return;
            }
            // Sélection d'un conseiller — préserve le teamContext courant.
            pushScope("conseiller", value, teamContext);
          }}
          className={cn(
            "rounded-md border bg-card px-3 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
            currentScope === "conseiller" ? "border-primary" : "border-border",
          )}
        >
          <option value="">Par conseiller…</option>
          {teamContext && (
            <option value={ALL_TEAM_SENTINEL}>Toute l&apos;équipe</option>
          )}
          {conseillers.map((u) => {
            // Quand un teamContext est actif, toutes les options sont déjà de
            // la même équipe → on masque le préfixe "Équipe X — " redondant.
            const showTeamPrefix = !teamContext && u.teamName !== "—";
            return (
              <option key={u.id} value={u.id}>
                {showTeamPrefix ? `${u.teamName} — ` : ""}
                {u.firstName} {u.lastName}
              </option>
            );
          })}
        </select>
      )}
    </div>
  );
}
