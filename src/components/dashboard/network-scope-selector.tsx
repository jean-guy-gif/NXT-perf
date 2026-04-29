"use client";

import { Globe2, Building2, Users, User, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  NetworkScopeFilter,
  NetworkAgencyOption,
  NetworkTeamOption,
  NetworkConseillerOption,
} from "@/hooks/use-network-production-chain";

/**
 * <NetworkScopeSelector> — sélecteur cascade 4 niveaux pour le tableau de bord
 * réseau (Vue Réseau v2.0 Task 4-bis).
 *
 * Layout : [🌐 Réseau] ▶ [🏢 Toutes les agences ▼] ▶ [👥 Toutes les équipes ▼] ▶ [👤 Tous les conseillers ▼]
 *
 * Cascade tolérante : tous les dropdowns sont toujours actifs. Quand l'utilisateur
 * sélectionne un niveau enfant directement, le composant infère et propage les
 * niveaux parents (`agencyId`, `teamId`) via `onScopeChange`.
 *
 * Filtre des options dropdown selon le scope amont :
 * - Niveau 3 (Équipe) : si `scope.agencyId` défini → uniquement les équipes de cette agence.
 * - Niveau 4 (Conseiller) : si `scope.teamId` défini → uniquement les conseillers de cette équipe.
 *   Sinon si `scope.agencyId` défini → conseillers de cette agence. Sinon tous.
 *
 * Active state visuel : si un niveau a une sélection (≠ "" / undefined), le dropdown
 * apparaît en couleur primary (border + bg léger).
 */

interface NetworkScopeSelectorProps {
  scope: NetworkScopeFilter;
  onScopeChange: (scope: NetworkScopeFilter) => void;
  agencies: NetworkAgencyOption[];
  teams: NetworkTeamOption[];
  conseillers: NetworkConseillerOption[];
}

export function NetworkScopeSelector({
  scope,
  onScopeChange,
  agencies,
  teams,
  conseillers,
}: NetworkScopeSelectorProps) {
  // Filtrage cascade des options dropdown
  const visibleTeams = scope.agencyId
    ? teams.filter((t) => t.agencyId === scope.agencyId)
    : teams;

  const visibleConseillers = scope.teamId
    ? conseillers.filter((c) => c.teamId === scope.teamId)
    : scope.agencyId
      ? conseillers.filter((c) => c.agencyId === scope.agencyId)
      : conseillers;

  // Active state pour styling
  const agencyActive = scope.level !== "network" && !!scope.agencyId;
  const teamActive = (scope.level === "team" || scope.level === "individual") && !!scope.teamId;
  const userActive = scope.level === "individual" && !!scope.userId;

  // ── Handlers cascade ──
  function handleNetworkClick() {
    onScopeChange({ level: "network" });
  }

  function handleAgencyChange(value: string) {
    if (value === "") {
      onScopeChange({ level: "network" });
      return;
    }
    onScopeChange({ level: "agency", agencyId: value });
  }

  function handleTeamChange(value: string) {
    if (value === "") {
      // Reset équipe → remonter au niveau agence (ou network si pas d'agence)
      if (scope.agencyId) {
        onScopeChange({ level: "agency", agencyId: scope.agencyId });
      } else {
        onScopeChange({ level: "network" });
      }
      return;
    }
    const team = teams.find((t) => t.id === value);
    if (!team) return;
    // Cascade ascendante : on fixe l'agencyId parent
    onScopeChange({
      level: "team",
      agencyId: team.agencyId,
      teamId: value,
    });
  }

  function handleConseillerChange(value: string) {
    if (value === "") {
      // Reset conseiller → remonter au niveau équipe (ou agence ou network)
      if (scope.teamId) {
        onScopeChange({
          level: "team",
          agencyId: scope.agencyId,
          teamId: scope.teamId,
        });
      } else if (scope.agencyId) {
        onScopeChange({ level: "agency", agencyId: scope.agencyId });
      } else {
        onScopeChange({ level: "network" });
      }
      return;
    }
    const conseiller = conseillers.find((c) => c.id === value);
    if (!conseiller) return;
    // Cascade ascendante : on infère teamId et agencyId depuis le conseiller
    onScopeChange({
      level: "individual",
      agencyId: conseiller.agencyId,
      teamId: conseiller.teamId,
      userId: value,
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Scope :</span>

      {/* Niveau 1 — Réseau (badge cliquable, actif quand level==="network") */}
      <button
        type="button"
        onClick={handleNetworkClick}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
          scope.level === "network"
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        aria-label="Retour au scope réseau global"
      >
        <Globe2 className="h-3.5 w-3.5" />
        Réseau
      </button>

      <ChevronRight className="hidden h-3.5 w-3.5 text-muted-foreground/50 md:block" />

      {/* Niveau 2 — Agence (dropdown) */}
      <ScopeDropdown
        icon={<Building2 className="h-3.5 w-3.5" />}
        active={agencyActive}
        value={scope.agencyId ?? ""}
        onChange={handleAgencyChange}
        placeholder="Toutes les agences"
        options={agencies}
        ariaLabel="Filtrer par agence"
      />

      <ChevronRight className="hidden h-3.5 w-3.5 text-muted-foreground/50 md:block" />

      {/* Niveau 3 — Équipe (dropdown) */}
      <ScopeDropdown
        icon={<Users className="h-3.5 w-3.5" />}
        active={teamActive}
        value={scope.teamId ?? ""}
        onChange={handleTeamChange}
        placeholder="Toutes les équipes"
        options={visibleTeams}
        ariaLabel="Filtrer par équipe"
      />

      <ChevronRight className="hidden h-3.5 w-3.5 text-muted-foreground/50 md:block" />

      {/* Niveau 4 — Conseiller (dropdown) */}
      <ScopeDropdown
        icon={<User className="h-3.5 w-3.5" />}
        active={userActive}
        value={scope.userId ?? ""}
        onChange={handleConseillerChange}
        placeholder="Tous les conseillers"
        options={visibleConseillers}
        ariaLabel="Filtrer par conseiller"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScopeDropdown — <select> natif stylisé (cohérent + accessible)
// ─────────────────────────────────────────────────────────────────────────────

interface ScopeDropdownProps {
  icon: React.ReactNode;
  active: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Array<{ id: string; name: string }>;
  ariaLabel: string;
}

function ScopeDropdown({
  icon,
  active,
  value,
  onChange,
  placeholder,
  options,
  ariaLabel,
}: ScopeDropdownProps) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-foreground hover:bg-muted/50",
      )}
    >
      <span className={active ? "text-primary" : "text-muted-foreground"}>{icon}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={cn(
          "cursor-pointer bg-transparent pr-1 outline-none",
          active ? "text-primary" : "text-foreground",
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
    </label>
  );
}
