"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LockedFeature } from "@/components/subscription/locked-feature";
import { ImprovementCatalogue } from "@/components/dashboard/improvement-catalogue";
import { useRatios } from "@/hooks/use-ratios";
import { useUser } from "@/hooks/use-user";
import { useResults } from "@/hooks/use-results";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { ProgressBar } from "@/components/charts/progress-bar";
import { RatioDrillDownModal } from "@/components/dashboard/ratio-drill-down-modal";
import { RATIO_ID_TO_EXPERTISE_ID, buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import { getAvgCommissionEur, deriveProfileLevel } from "@/lib/get-avg-commission";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import type { RatioId } from "@/types/ratios";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import {
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { getHumanScore, getGlobalScore } from "@/lib/scoring";
import { formatBenchmark } from "@/data/mock-benchmark";
import { useAppStore } from "@/stores/app-store";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useSupabase } from "@/hooks/use-supabase";
import { PERFORMANCE_BADGES, LEVEL_EMOJI } from "@/lib/performance-badge-service";
import type { DbPerformanceBadge } from "@/lib/performance-badge-service";
import { initDemoDPISnapshot } from "@/lib/demo-dpi-init";

const statusConfig = {
  ok: {
    icon: CheckCircle,
    label: "Conforme",
    color: "text-green-500",
    bg: "bg-green-500/10",
    border: "border-green-500/25",
    dot: "bg-green-500",
  },
  warning: {
    icon: AlertTriangle,
    label: "Vigilance",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/25",
    dot: "bg-orange-500",
  },
  danger: {
    icon: XCircle,
    label: "Sous-performance",
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/25",
    dot: "bg-red-500",
  },
};

export default function PerformancePage() {
  const { user, category } = useUser();
  const { computedRatios, ratioConfigs } = useRatios();
  const results = useResults();
  const [selectedRatioId, setSelectedRatioId] = useState<RatioId | null>(null);
  const [expandedRatio, setExpandedRatio] = useState<string | null>(null);
  const [viewMode, setViewMode] = usePersistedState<"chiffres" | "pourcentages">("nxt-perf-view-mode", "chiffres");
  const isDemo = useAppStore((s) => s.isDemo);
  const supabase = useSupabase();
  const [perfBadges, setPerfBadges] = useState<DbPerformanceBadge[]>([]);
  const router = useRouter();
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const allResults = useAppStore((s) => s.results);
  const { createPlan30j } = useImprovementResources();
  const [targetedToast, setTargetedToast] = useState<
    { type: "success" | "error" | "info"; message: string } | null
  >(null);

  const handleTargetedPlanRequest = async (ratioId: ExpertiseRatioId) => {
    if (!results) {
      setTargetedToast({ type: "error", message: "Données de performance introuvables" });
      return;
    }
    try {
      const userHistory = allResults.filter((r) => r.userId === user?.id);
      const measuredRatios = buildMeasuredRatios(computedRatios, results);
      const profile = deriveProfileLevel(category);
      const avgCommissionEur = getAvgCommissionEur(
        agencyObjective?.avgActValue,
        userHistory
      );
      await createPlan30j({
        mode: "targeted",
        ratioId,
        measuredRatios,
        profile,
        avgCommissionEur,
      });
      router.push("/formation?tab=plan30");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("PLAN_ACTIVE_ALREADY")) {
        setTargetedToast({
          type: "info",
          message: "Vous avez déjà un plan actif, voici votre plan actuel",
        });
        router.push("/formation?tab=plan30");
      } else {
        setTargetedToast({ type: "error", message: "Erreur lors de la création du plan" });
      }
    }
  };

  useEffect(() => {
    if (isDemo || !user?.id) return;
    supabase.from("performance_badges").select("*").eq("user_id", user.id).eq("is_active", true)
      .then(({ data }) => { if (data) setPerfBadges(data as DbPerformanceBadge[]); });
  }, [supabase, isDemo, user?.id]);

  useEffect(() => {
    if (isDemo && user?.id) {
      initDemoDPISnapshot(user.id);
    }
  }, [isDemo, user?.id]);

  const globalScore = getGlobalScore(computedRatios);

  const overallPerformance =
    computedRatios.length > 0
      ? Math.round(
          computedRatios.reduce((acc, r) => acc + r.percentageOfTarget, 0) /
            computedRatios.length
        )
      : 0;

  const statusCounts = computedRatios.reduce(
    (acc, r) => {
      acc[r.status]++;
      return acc;
    },
    { ok: 0, warning: 0, danger: 0 } as Record<string, number>
  );

  const overallStatus =
    overallPerformance >= 80
      ? "ok"
      : overallPerformance >= 60
        ? "warning"
        : ("danger" as const);

  if (!results && computedRatios.length === 0) {
    return (
      <LockedFeature feature="performance" featureName="Ma Performance" featureDescription="Analysez vos ratios et benchmarks métier">
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-5">
            <Gauge className="h-8 w-8 text-primary/50" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Vos ratios de performance</h2>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
            Vos ratios apparaîtront ici après votre première saisie. Continuez à saisir chaque semaine pour voir votre progression.
          </p>
          <a href="/saisie" className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Saisir mes résultats
          </a>
        </div>
      </LockedFeature>
    );
  }

  return (
    <LockedFeature feature="performance" featureName="Ma Performance" featureDescription="Analysez vos ratios et benchmarks métier">
    <div className="space-y-6">
      {targetedToast && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            targetedToast.type === "success" && "border-green-500/30 bg-green-500/10 text-green-700",
            targetedToast.type === "error" && "border-red-500/30 bg-red-500/10 text-red-700",
            targetedToast.type === "info" && "border-amber-500/30 bg-amber-500/10 text-amber-700"
          )}
        >
          {targetedToast.message}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
            <Gauge className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Ma Performance
            </h1>
            <p className="text-sm text-muted-foreground">
              Ratios calculés automatiquement selon votre niveau
            </p>
          </div>
        </div>
        {user && (
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              CATEGORY_COLORS[user.category]
            )}
          >
            {CATEGORY_LABELS[user.category]}
          </span>
        )}
      </div>

      {/* Toggle Chiffres / Pourcentages */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        <button type="button" onClick={() => setViewMode("chiffres")}
          className={cn("rounded-md px-4 py-1.5 text-xs font-medium transition-colors",
            viewMode === "chiffres" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          Chiffres
        </button>
        <button type="button" onClick={() => setViewMode("pourcentages")}
          className={cn("rounded-md px-4 py-1.5 text-xs font-medium transition-colors",
            viewMode === "pourcentages" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          Pourcentages
        </button>
      </div>


      {/* Ratios Detail Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Détail des 7 ratios métier
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {computedRatios.map((ratio) => {
            const config = ratioConfigs[ratio.ratioId as RatioId];
            if (!config) return null;
            const sc = statusConfig[ratio.status];
            const StatusIcon = sc.icon;
            const humanScore = getHumanScore(ratio);
            const MarketIcon = humanScore.vsMarket === "above" ? TrendingUp : humanScore.vsMarket === "below" ? TrendingDown : Minus;
            const marketIconColor = humanScore.vsMarket === "above" ? "text-green-500" : humanScore.vsMarket === "below" ? "text-red-500" : "text-muted-foreground";

            return (
              <div
                key={ratio.ratioId}
                onClick={() => setSelectedRatioId(ratio.ratioId as RatioId)}
                className={cn(
                  "cursor-pointer rounded-xl border bg-card p-5 transition-colors hover:shadow-md",
                  sc.border
                )}
              >
                {/* Performance badge on ratio card */}
                {(() => {
                  const RATIO_BADGE_MAP: Record<string, string> = {
                    "contacts": "prospecteur", "rdv": "prospecteur",
                    "estimation": "roi_estimation",
                    "exclusiv": "maitre_exclusivite",
                    "visite": "visiteur_pro",
                    "offre": "closing_master",
                    "compromis": "finisher", "acte": "finisher",
                  };
                  const nameLC = config.name.toLowerCase();
                  const badgeKey = Object.entries(RATIO_BADGE_MAP).find(([kw]) => nameLC.includes(kw))?.[1];
                  const matched = badgeKey ? perfBadges.find((pb) => pb.badge_key === badgeKey) : null;
                  const regBadge = perfBadges.find((pb) => pb.badge_key === "regularite");
                  const badge = matched || regBadge;
                  if (!badge) return null;
                  const def = PERFORMANCE_BADGES.find((d) => d.key === badge.badge_key);
                  return (
                    <div className="flex items-center gap-1 text-[10px] text-primary/70 mb-1"
                      title={`${def?.name} ${badge.level} — ${badge.consecutive_months} mois`}>
                      <span>{def?.emoji}</span>
                      <span>{LEVEL_EMOJI[badge.level]}</span>
                    </div>
                  );
                })()}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {config.name}
                    </p>
                    <span
                      data-tooltip-id="ratio-tooltip"
                      data-tooltip-content={config.description}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
                    </span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      sc.bg,
                      sc.color
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {sc.label}
                  </div>
                </div>

                {/* Current Value */}
                <p className={cn("mt-3 text-3xl font-bold", sc.color)}>
                  {viewMode === "pourcentages"
                    ? `${Math.round(ratio.percentageOfTarget)}%`
                    : config.isPercentage
                      ? `${Math.round(ratio.value)}%`
                      : ratio.value.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {viewMode === "pourcentages" ? "de l'objectif" : config.unit}
                </p>

                {/* Progress */}
                {/* Scoring badge */}
                <span className={cn("mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", humanScore.bgColor, humanScore.color)}>
                  <MarketIcon className={cn("h-3 w-3", marketIconColor)} />
                  {humanScore.label}
                </span>

                <ProgressBar
                  value={ratio.percentageOfTarget}
                  status={ratio.status}
                  showValue={false}
                  size="sm"
                  className="mt-3"
                />
                <p className="text-xs text-muted-foreground mt-1">{formatBenchmark(ratio.ratioId as RatioId)}</p>

                {/* Threshold info */}
                <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Objectif {CATEGORY_LABELS[category]}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    {config.isPercentage
                      ? `${ratio.thresholdForCategory}%`
                      : `${ratio.thresholdForCategory} ${config.unit}`}
                  </span>
                </div>

                {/* Améliorer ce ratio — only for warning/danger */}
                {(ratio.status === "warning" || ratio.status === "danger") && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedRatio(expandedRatio === ratio.ratioId ? null : ratio.ratioId);
                      }}
                      className="mt-3 w-full text-xs font-medium text-primary hover:text-primary/80 transition-colors text-left"
                    >
                      {expandedRatio === ratio.ratioId ? "Fermer ✕" : "Améliorer ce ratio →"}
                    </button>
                    {expandedRatio === ratio.ratioId && (
                      <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <p className="text-xs text-muted-foreground mb-3">
                          Votre {config.name.split("→")[0].trim().toLowerCase()} est à {Math.round(ratio.percentageOfTarget)}% de l'objectif {CATEGORY_LABELS[category]}.
                        </p>
                        <ImprovementCatalogue
                          gap={100 - ratio.percentageOfTarget}
                          ratioName={config.name.split("→")[0].trim().toLowerCase()}
                          ratioId={RATIO_ID_TO_EXPERTISE_ID[ratio.ratioId as RatioId] ?? undefined}
                          onTargetedPlanRequest={handleTargetedPlanRequest}
                        />
                      </div>
                    )}
                  </>
                )}

              </div>
            );
          })}
        </div>
      </div>

      {/* Ratio tooltip (shared instance) */}
      <Tooltip
        id="ratio-tooltip"
        place="top"
        className="!max-w-xs !rounded-lg !text-xs !leading-relaxed"
      />

      {/* Drill-down modal */}
      {selectedRatioId && results && (
        <RatioDrillDownModal
          ratioId={selectedRatioId}
          computedRatio={
            computedRatios.find((r) => r.ratioId === selectedRatioId)!
          }
          ratioConfig={ratioConfigs[selectedRatioId]}
          results={results}
          onClose={() => setSelectedRatioId(null)}
        />
      )}
    </div>
    </LockedFeature>
  );
}
