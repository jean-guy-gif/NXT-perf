"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNetworkProductionChain } from "@/hooks/use-network-production-chain";
import { NetworkProductionChain } from "@/components/dashboard/network-production-chain";
import type { ViewMode, PeriodMode } from "@/components/dashboard/production-chain";
import type { CategoryMix } from "@/hooks/use-network-production-chain";

/**
 * /reseau/dashboard — Tableau de bord Réseau (Vue Réseau v2.0 Phase 1 Task 4.2).
 *
 * Strict miroir visuel de /directeur/pilotage mais agrégé à l'échelle réseau
 * via useNetworkProductionChain (ruissellement total des objectifs).
 *
 * Composition :
 * - Header (icône + titre + sous-titre + ScoreBadge réseau global)
 * - Toggle Volumes / Ratios / Les deux
 * - Sub-header [N] collaborateurs · Objectifs pondérés (popover) · période
 * - Toggle Mois / Année
 * - <NetworkProductionChain /> (composant pur de présentation)
 *
 * Drill-down (Phase 2) : clic sur une carte → /reseau/volume-activite?step=...
 */
export default function ReseauDashboardPage() {
  const router = useRouter();
  const {
    steps,
    ratios,
    conseillerCount,
    categoryMix,
    period,
    setPeriod,
    displayMode,
    setDisplayMode,
  } = useNetworkProductionChain();

  // Score global réseau = moyenne des pcts des 12 steps.
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

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Compass className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tableau de bord Réseau</h1>
            <p className="text-sm text-muted-foreground">
              GPS de performance réseau — données mensuelles
            </p>
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

      {/* ═══ Toggle Volumes / Ratios / Les deux ═══ */}
      <ViewModeToggle value={displayMode} onChange={setDisplayMode} />

      {/* ═══ Sub-header : [N] collaborateurs · Objectifs pondérés · période + Toggle Mois/Année ═══ */}
      {/* Pas de flex-wrap : on garde sub-header gauche / toggle droite sur la
          même ligne (évite que le toggle soit poussé en ligne séparée sur des
          largeurs intermédiaires). Sur mobile très étroit, le sub-header
          interne se condensera grâce à son propre flex-wrap interne. */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <SubHeader
          conseillerCount={conseillerCount}
          categoryMix={categoryMix}
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
// Sub-header avec popover "Objectifs pondérés"
// ─────────────────────────────────────────────────────────────────────────────

function SubHeader({
  conseillerCount,
  categoryMix,
  period,
}: {
  conseillerCount: number;
  categoryMix: CategoryMix;
  period: PeriodMode;
}) {
  const [open, setOpen] = useState(false);
  const periodLabel = period === "ytd" ? "année à date" : "ce mois-ci";

  return (
    <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
      <Users className="h-4 w-4" />
      <span>
        <strong className="text-foreground tabular-nums">{conseillerCount}</strong> collaborateurs
      </span>
      <span>·</span>
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
            <p className="mb-2 font-semibold text-foreground">Répartition des conseillers</p>
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
