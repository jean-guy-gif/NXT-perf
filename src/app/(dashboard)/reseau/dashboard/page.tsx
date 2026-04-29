"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";
import {
  useNetworkProductionChain,
  type NetworkScopeFilter,
  type NetworkScopeMeta,
  type CategoryMix,
} from "@/hooks/use-network-production-chain";
import { NetworkProductionChain } from "@/components/dashboard/network-production-chain";
import { NetworkScopeSelector } from "@/components/dashboard/network-scope-selector";
import type { ViewMode, PeriodMode } from "@/components/dashboard/production-chain";

/**
 * /reseau/dashboard — Tableau de bord Réseau (Vue Réseau v2.0).
 *
 * Phase 1 Task 4 + 4-bis : 4-niveau cascade scope filter (Réseau / Agence /
 * Équipe / Conseiller) qui pilote `useNetworkProductionChain`. Tous les
 * agrégats (steps, ratios, categoryMix, conseillerCount, scopeMeta) reflètent
 * le scope sélectionné.
 *
 * Composition :
 * - Header : icône + H1 dynamique + sous-titre dynamique + ScoreBadge
 * - <NetworkScopeSelector /> : 4 dropdowns cascade tolérante
 * - Toggle Volumes / Ratios / Les deux
 * - Sub-header scope-aware : count|nom · breadcrumb? · Objectifs pondérés|catégorie · période
 * - Toggle Mois / Année
 * - <NetworkProductionChain /> : les 12 cartes + 7 ratios
 *
 * Drill-down : clic sur une carte → /reseau/volume-activite?step=... (Phase 2).
 */
export default function ReseauDashboardPage() {
  const router = useRouter();
  const [scope, setScope] = useState<NetworkScopeFilter>({ level: "network" });

  const {
    steps,
    ratios,
    conseillerCount,
    categoryMix,
    availableAgencies,
    availableTeams,
    availableConseillers,
    scopeMeta,
    period,
    setPeriod,
    displayMode,
    setDisplayMode,
  } = useNetworkProductionChain(scope);

  // Score global réseau = moyenne des pcts des 12 steps (recalculé pour le scope actif).
  const globalPct = useMemo(() => {
    if (steps.length === 0) return 0;
    return Math.round(steps.reduce((s, x) => s + x.pct, 0) / steps.length);
  }, [steps]);

  const globalBadge = useMemo(() => {
    if (globalPct >= 100) {
      return { label: "Excellent niveau", className: "bg-green-500/15 text-green-500 border-green-500/30" };
    }
    if (globalPct >= 90) {
      return { label: "Bon niveau", className: "bg-green-500/10 text-green-500 border-green-500/20" };
    }
    if (globalPct >= 75) {
      return { label: "Niveau correct", className: "bg-orange-500/10 text-orange-500 border-orange-500/30" };
    }
    return { label: "À améliorer", className: "bg-red-500/10 text-red-500 border-red-500/30" };
  }, [globalPct]);

  // Titre H1 + sous-titre dynamiques selon le scope.
  const h1 = scopeMeta.titleSuffix
    ? `Tableau de bord — ${scopeMeta.titleSuffix}`
    : "Tableau de bord";

  const subtitle =
    scope.level === "individual"
      ? "GPS de performance individuelle — données mensuelles"
      : scope.level === "team"
        ? "GPS de performance équipe — données mensuelles"
        : scope.level === "agency"
          ? "GPS de performance agence — données mensuelles"
          : "GPS de performance réseau — données mensuelles";

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Compass className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{h1}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
            globalBadge.className,
          )}
        >
          {globalBadge.label}{" "}
          <span className="ml-1 tabular-nums opacity-75">({globalPct}%)</span>
        </span>
      </div>

      {/* ═══ Sélecteur de scope cascade 4 niveaux ═══ */}
      <NetworkScopeSelector
        scope={scope}
        onScopeChange={setScope}
        agencies={availableAgencies}
        teams={availableTeams}
        conseillers={availableConseillers}
      />

      {/* ═══ Toggle Volumes / Ratios / Les deux ═══ */}
      <ViewModeToggle value={displayMode} onChange={setDisplayMode} />

      {/* ═══ Sub-header scope-aware + Toggle Mois/Année ═══ */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <SubHeader
          conseillerCount={conseillerCount}
          categoryMix={categoryMix}
          scopeMeta={scopeMeta}
          scopeLevel={scope.level}
          period={period}
        />
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {/* ═══ Chaîne 12 étapes ═══ */}
      <NetworkProductionChain
        steps={steps}
        ratios={ratios}
        displayMode={displayMode}
        onStepClick={(stepId) =>
          router.push(`/reseau/volume-activite?step=${stepId}`)
        }
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-header scope-aware : count|nom · breadcrumb? · Objectifs|catégorie · période
// ─────────────────────────────────────────────────────────────────────────────

interface SubHeaderProps {
  conseillerCount: number;
  categoryMix: CategoryMix;
  scopeMeta: NetworkScopeMeta;
  scopeLevel: NetworkScopeFilter["level"];
  period: PeriodMode;
}

function SubHeader({
  conseillerCount,
  categoryMix,
  scopeMeta,
  scopeLevel,
  period,
}: SubHeaderProps) {
  const [open, setOpen] = useState(false);
  const periodLabel = period === "ytd" ? "année à date" : "ce mois-ci";

  // En mode individual, on affiche le nom du conseiller à la place du count
  // et la catégorie réelle à la place de "Objectifs pondérés".
  const isIndividual = scopeLevel === "individual";
  const categoryLabel = scopeMeta.userCategory
    ? CATEGORY_LABELS[scopeMeta.userCategory]
    : null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
      <Users className="h-4 w-4" />
      {isIndividual ? (
        <span className="font-semibold text-foreground">
          {scopeMeta.titleSuffix}
        </span>
      ) : (
        <span>
          <strong className="text-foreground tabular-nums">
            {conseillerCount}
          </strong>{" "}
          collaborateur{conseillerCount > 1 ? "s" : ""}
        </span>
      )}

      {scopeMeta.contextLabel && (
        <>
          <span>·</span>
          <span className="text-foreground/80">{scopeMeta.contextLabel}</span>
        </>
      )}

      <span>·</span>

      {isIndividual && categoryLabel ? (
        <span className="font-medium text-foreground">{categoryLabel}</span>
      ) : (
        <span
          className="relative"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="cursor-help underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground"
            aria-expanded={open}
          >
            Objectifs pondérés
          </button>
          {open && (
            <span
              role="tooltip"
              className="absolute left-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-popover p-3 text-xs text-popover-foreground shadow-lg"
            >
              <p className="mb-2 font-semibold text-foreground">
                Répartition des conseillers
              </p>
              <ul className="space-y-1">
                <li className="flex justify-between">
                  <span>Junior</span>
                  <span className="tabular-nums">
                    {categoryMix.debutant.count} ({categoryMix.debutant.pct}%)
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Confirmé</span>
                  <span className="tabular-nums">
                    {categoryMix.confirme.count} ({categoryMix.confirme.pct}%)
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Expert</span>
                  <span className="tabular-nums">
                    {categoryMix.expert.count} ({categoryMix.expert.pct}%)
                  </span>
                </li>
              </ul>
            </span>
          )}
        </span>
      )}

      <span>·</span>
      <span>{periodLabel}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggles
// ─────────────────────────────────────────────────────────────────────────────

const VIEW_MODE_OPTIONS: Array<{ value: ViewMode; label: string }> = [
  { value: "volumes", label: "Volumes" },
  { value: "ratios", label: "Ratios" },
  { value: "both", label: "Les deux" },
];

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-1 text-xs">
      {VIEW_MODE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium transition-colors",
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function PeriodToggle({
  value,
  onChange,
}: {
  value: PeriodMode;
  onChange: (v: PeriodMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border text-xs">
      <button
        type="button"
        onClick={() => onChange("mois")}
        className={cn(
          "rounded-l-lg px-3 py-1 font-medium transition-colors",
          value === "mois"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted",
        )}
      >
        Mois
      </button>
      <button
        type="button"
        onClick={() => onChange("ytd")}
        className={cn(
          "rounded-r-lg px-3 py-1 font-medium transition-colors",
          value === "ytd"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted",
        )}
      >
        Année
      </button>
    </div>
  );
}
