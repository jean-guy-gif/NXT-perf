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
import { RATIO_PERCENT_LABELS, formatRatioObjectiveValue, formatRatioCurrentValue } from "@/lib/ratio-labels";
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
  Check,
  AlertTriangle,
  X,
  ArrowRight,
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
    icon: Check,
    label: "Conforme",
    color: "text-green-500",
    bg: "bg-green-500/10",
    dot: "bg-green-500",
  },
  warning: {
    icon: AlertTriangle,
    label: "Vigilance",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    dot: "bg-orange-500",
  },
  danger: {
    icon: X,
    label: "Sous-performance",
    color: "text-red-500",
    bg: "bg-red-500/10",
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

  // Suppress unused var warnings for kept-but-not-rendered metrics
  void globalScore;
  void statusCounts;
  void overallStatus;

  if (!results && computedRatios.length === 0) {
    return (
      <LockedFeature feature="performance" featureName="Ma Performance" featureDescription="Analysez vos ratios et benchmarks métier">
        <section className="mx-auto max-w-3xl px-4 py-12">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Gauge className="h-6 w-6 text-primary" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-foreground">
              Vos ratios de performance
            </h2>
            <p className="mb-6 max-w-md text-base leading-relaxed text-muted-foreground">
              Vos ratios apparaîtront ici après votre première saisie. Continuez à saisir
              chaque semaine pour voir votre progression.
            </p>
            <a
              href="/saisie"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
            >
              Saisir mes résultats
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </section>
      </LockedFeature>
    );
  }

  return (
    <LockedFeature feature="performance" featureName="Ma Performance" featureDescription="Analysez vos ratios et benchmarks métier">
      <div>
        {/* ═══ PAGE HEADER ═══ */}
        <header className="mx-auto max-w-6xl px-4 pt-8 pb-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Gauge className="h-3.5 w-3.5" />
            Performance
          </div>
          <h1 className="text-3xl font-bold text-foreground">Ma Performance</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Vos 7 ratios métier, calculés automatiquement et comparés à votre objectif{" "}
            {CATEGORY_LABELS[category]} et au benchmark marché.
          </p>
        </header>

        {/* ═══ TOAST (conditional) ═══ */}
        {targetedToast && (
          <div className="mx-auto max-w-6xl px-4 pb-6">
            <div
              className={cn(
                "rounded-xl border px-4 py-3 text-sm",
                targetedToast.type === "success" && "border-green-500/30 bg-green-500/10 text-green-600",
                targetedToast.type === "error" && "border-red-500/30 bg-red-500/10 text-red-600",
                targetedToast.type === "info" && "border-orange-500/30 bg-orange-500/10 text-orange-600"
              )}
            >
              {targetedToast.message}
            </div>
          </div>
        )}

        {/* ═══ SECTION — DÉTAIL DES 7 RATIOS ═══ */}
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Target className="h-3.5 w-3.5" />
            Détail
          </div>
          <h2 className="mb-3 text-3xl font-bold text-foreground">
            Vos 7 ratios métier
          </h2>
          <p className="mb-8 max-w-2xl text-muted-foreground">
            Cliquez sur un ratio pour voir le détail. Si un ratio est en alerte, lancez un
            plan 30 jours ciblé.
          </p>

          {/* Control bar */}
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setViewMode("chiffres")}
                className={cn(
                  "rounded-md px-4 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "chiffres"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Chiffres
              </button>
              <button
                type="button"
                onClick={() => setViewMode("pourcentages")}
                className={cn(
                  "rounded-md px-4 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "pourcentages"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Pourcentages
              </button>
            </div>
            {user && (
              <span
                className={cn(
                  "self-start rounded-full px-3 py-1 text-xs font-medium",
                  CATEGORY_COLORS[user.category]
                )}
              >
                Profil {CATEGORY_LABELS[user.category]}
              </span>
            )}
          </div>

          {/* Ratios grid — exception R14 : lg:grid-cols-4 pour lecture comparative */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {computedRatios.map((ratio) => {
              const config = ratioConfigs[ratio.ratioId as RatioId];
              if (!config) return null;
              const sc = statusConfig[ratio.status];
              const StatusIcon = sc.icon;
              const humanScore = getHumanScore(ratio);
              const MarketIcon =
                humanScore.vsMarket === "above"
                  ? TrendingUp
                  : humanScore.vsMarket === "below"
                    ? TrendingDown
                    : Minus;
              const marketIconColor =
                humanScore.vsMarket === "above"
                  ? "text-green-500"
                  : humanScore.vsMarket === "below"
                    ? "text-red-500"
                    : "text-muted-foreground";

              return (
                <div
                  key={ratio.ratioId}
                  onClick={() => setSelectedRatioId(ratio.ratioId as RatioId)}
                  className="cursor-pointer rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
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
                      <div
                        className="mb-1 flex items-center gap-1 text-[10px] text-primary/70"
                        title={`${def?.name} ${badge.level} — ${badge.consecutive_months} mois`}
                      >
                        <span>{def?.emoji}</span>
                        <span>{LEVEL_EMOJI[badge.level]}</span>
                      </div>
                    );
                  })()}

                  {/* Header: name + tooltip + status badge top-right */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold leading-tight text-foreground">
                        {viewMode === "pourcentages"
                          ? RATIO_PERCENT_LABELS[ratio.ratioId as RatioId] ?? config.name
                          : config.name}
                      </p>
                      <span
                        data-tooltip-id="ratio-tooltip"
                        data-tooltip-content={config.description}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className="h-3.5 w-3.5 text-muted-foreground/60 transition-colors hover:text-muted-foreground" />
                      </span>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
                        sc.bg,
                        sc.color
                      )}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {sc.label}
                    </span>
                  </div>

                  {/* Current Value — neutral foreground (color is on the badge) */}
                  <p className="mt-3 text-3xl font-bold tabular-nums text-foreground">
                    {viewMode === "pourcentages"
                      ? formatRatioCurrentValue(ratio.ratioId as RatioId, ratio.value)
                      : config.isPercentage
                        ? `${Math.round(ratio.value)}%`
                        : ratio.value.toFixed(1)}
                  </p>
                  {viewMode !== "pourcentages" && (
                    <p className="text-xs text-muted-foreground">
                      {config.unit}
                    </p>
                  )}

                  {/* Scoring badge vsMarket */}
                  <span
                    className={cn(
                      "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      humanScore.bgColor,
                      humanScore.color
                    )}
                  >
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
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatBenchmark(ratio.ratioId as RatioId)}
                  </p>

                  {/* Threshold info */}
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Objectif {CATEGORY_LABELS[category]}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-foreground">
                      {viewMode === "pourcentages"
                        ? formatRatioObjectiveValue(ratio.ratioId as RatioId, ratio.thresholdForCategory)
                        : config.isPercentage
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
                        className="mt-3 w-full text-left text-xs font-medium text-primary transition-colors hover:text-primary/80"
                      >
                        {expandedRatio === ratio.ratioId ? "Fermer ✕" : "Améliorer ce ratio →"}
                      </button>
                      {expandedRatio === ratio.ratioId && (
                        <div
                          className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="mb-3 text-xs text-muted-foreground">
                            Votre {config.name.split("→")[0].trim().toLowerCase()} est à{" "}
                            {Math.round(ratio.percentageOfTarget)}% de l&apos;objectif{" "}
                            {CATEGORY_LABELS[category]}.
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
        </section>

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
