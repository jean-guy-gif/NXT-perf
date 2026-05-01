"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { ArrowLeft, Check, AlertTriangle, X, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useResults } from "@/hooks/use-results";
import { useRatios } from "@/hooks/use-ratios";
import { ProgressBar } from "@/components/charts/progress-bar";
import { CATEGORY_LABELS } from "@/lib/constants";
import { RATIO_ID_TO_EXPERTISE_ID } from "@/lib/ratio-to-expertise";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import type { ComputedRatio, RatioConfig, RatioId } from "@/types/ratios";

const STATUS_STYLE = {
  ok: {
    icon: Check,
    label: "Conforme",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    ring: "border-emerald-500/30",
  },
  warning: {
    icon: AlertTriangle,
    label: "Vigilance",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    ring: "border-orange-500/30",
  },
  danger: {
    icon: X,
    label: "Sous-performance",
    color: "text-red-500",
    bg: "bg-red-500/10",
    ring: "border-red-500/30",
  },
} as const;

interface Props {
  /** ID du ratio à mettre en surbrillance et scroller (ExpertiseRatioId) */
  highlightedItem: string | null;
}

// Reverse map ExpertiseRatioId → RatioId pour scroll/highlight
const EXPERTISE_TO_RATIO_ID: Partial<Record<ExpertiseRatioId, RatioId>> = (
  Object.entries(RATIO_ID_TO_EXPERTISE_ID) as [RatioId, ExpertiseRatioId | null][]
).reduce(
  (acc, [ratioId, expertiseId]) => {
    if (expertiseId) acc[expertiseId] = ratioId;
    return acc;
  },
  {} as Partial<Record<ExpertiseRatioId, RatioId>>
);

export function DiagnosticRatiosView({ highlightedItem }: Props) {
  const { user, category } = useUser();
  const { computedRatios, ratioConfigs } = useRatios();
  const results = useResults();

  // ID legacy à highlighter (depuis ExpertiseRatioId fourni en URL)
  const targetRatioId = useMemo<RatioId | null>(() => {
    if (!highlightedItem) return null;
    return (
      EXPERTISE_TO_RATIO_ID[highlightedItem as ExpertiseRatioId] ?? null
    );
  }, [highlightedItem]);

  // Scroll sur le ratio ciblé après montage
  useEffect(() => {
    if (!targetRatioId) return;
    const t = setTimeout(() => {
      const el = document.querySelector(
        `[data-highlight-id="ratio:${targetRatioId}"]`
      );
      if (el && "scrollIntoView" in el) {
        (el as HTMLElement).scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 80);
    return () => clearTimeout(t);
  }, [targetRatioId]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4">
      <Link
        href="/conseiller/diagnostic"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au diagnostic
      </Link>

      <header>
        <h2 className="text-2xl font-bold text-foreground">Mes ratios</h2>
        {user && (
          <p className="mt-1 text-sm text-muted-foreground">
            Vos ratios métier comparés à votre profil{" "}
            <span className="font-semibold text-foreground">
              {CATEGORY_LABELS[category]}
            </span>
            .
          </p>
        )}
      </header>

      {!results || computedRatios.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Aucune donnée disponible. Continuez votre saisie hebdomadaire pour
          voir vos ratios.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {computedRatios.map((ratio) => {
            const config: RatioConfig | undefined =
              ratioConfigs[ratio.ratioId as RatioId];
            if (!config) return null;
            const sc = STATUS_STYLE[ratio.status];
            const Icon = sc.icon;
            const isHighlighted = ratio.ratioId === targetRatioId;
            return (
              <RatioCard
                key={ratio.ratioId}
                ratio={ratio}
                config={config}
                category={category}
                statusBg={sc.bg}
                statusColor={sc.color}
                statusRing={sc.ring}
                statusLabel={sc.label}
                statusIcon={Icon}
                isHighlighted={isHighlighted}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface RatioCardProps {
  ratio: ComputedRatio;
  config: RatioConfig;
  category: string;
  statusBg: string;
  statusColor: string;
  statusRing: string;
  statusLabel: string;
  statusIcon: React.ComponentType<{ className?: string }>;
  isHighlighted: boolean;
}

function RatioCard({
  ratio,
  config,
  category,
  statusBg,
  statusColor,
  statusRing,
  statusLabel,
  statusIcon: StatusIcon,
  isHighlighted,
}: RatioCardProps) {
  return (
    <div
      data-highlight-id={`ratio:${ratio.ratioId}`}
      className={cn(
        "rounded-xl border bg-card p-5 transition-all duration-300",
        statusRing,
        isHighlighted &&
          "scale-[1.02] ring-2 ring-primary shadow-lg animate-pulse"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight text-foreground">
          {config.name}
        </p>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
            statusBg,
            statusColor
          )}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {statusLabel}
        </span>
      </div>

      <p className="mt-3 text-3xl font-bold tabular-nums text-foreground">
        {config.isPercentage
          ? `${Math.round(ratio.value)}%`
          : ratio.value.toFixed(1)}
      </p>
      <p className="text-xs text-muted-foreground">{config.unit}</p>

      <ProgressBar
        value={ratio.percentageOfTarget}
        status={ratio.status}
        showValue={false}
        size="sm"
        className="mt-3"
      />

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
    </div>
  );
}
