"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { ArrowLeft, Check, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useResults } from "@/hooks/use-results";
import { CATEGORY_OBJECTIVES } from "@/lib/constants";
import {
  computeEffectivePeriodMonths,
  determineRhythmStatus,
  isCurrentMonthInProgress,
  RHYTHM_LABEL,
  type RhythmStatus,
} from "@/lib/performance/pro-rated-objective";
import type { PeriodResults } from "@/types/results";

const STATUS_STYLE = {
  ok: {
    icon: Check,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    ring: "border-emerald-500/30",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    ring: "border-orange-500/30",
  },
  danger: {
    icon: X,
    color: "text-red-500",
    bg: "bg-red-500/10",
    ring: "border-red-500/30",
  },
} as const;

// PR3.8.6 — mapping rythme → couleur (cf. DiagnosticKpiCards).
const RHYTHM_STATUS_MAP: Record<RhythmStatus, keyof typeof STATUS_STYLE> = {
  ahead: "ok",
  on_track: "ok",
  behind: "warning",
};

type VolumeKey =
  | "contactsTotaux"
  | "rdvEstimation"
  | "estimationsRealisees"
  | "mandatsSignes"
  | "nombreVisites"
  | "offresRecues"
  | "compromisSignes"
  | "actesSignes";

interface VolumeRow {
  key: VolumeKey;
  label: string;
  current: number;
  monthly: number;
}

function buildRows(results: PeriodResults, category: string): VolumeRow[] {
  const obj =
    CATEGORY_OBJECTIVES[category] ?? CATEGORY_OBJECTIVES.confirme;
  return [
    {
      key: "contactsTotaux",
      label: "Contacts",
      current: results.prospection.contactsTotaux,
      monthly: obj.estimations * 15,
    },
    {
      key: "rdvEstimation",
      label: "RDV estimation",
      current: results.prospection.rdvEstimation,
      monthly: obj.estimations,
    },
    {
      key: "estimationsRealisees",
      label: "Estimations",
      current: results.vendeurs.estimationsRealisees,
      monthly: obj.estimations,
    },
    {
      key: "mandatsSignes",
      label: "Mandats",
      current: results.vendeurs.mandatsSignes,
      monthly: obj.mandats,
    },
    {
      key: "nombreVisites",
      label: "Visites",
      current: results.acheteurs.nombreVisites,
      monthly: obj.visites,
    },
    {
      key: "offresRecues",
      label: "Offres",
      current: results.acheteurs.offresRecues,
      monthly: obj.offres,
    },
    {
      key: "compromisSignes",
      label: "Compromis",
      current: results.acheteurs.compromisSignes,
      monthly: obj.compromis,
    },
    {
      key: "actesSignes",
      label: "Actes",
      current: results.ventes.actesSignes,
      monthly: obj.actes,
    },
  ];
}

interface Props {
  /** VolumeKey à mettre en surbrillance */
  highlightedItem: string | null;
}

export function DiagnosticVolumesView({ highlightedItem }: Props) {
  const { user, category } = useUser();
  const results = useResults();

  // PR3.8.6 — proration intra-mois (si la période couvre le mois en cours).
  const { effectiveMonths, isProrated } = useMemo(() => {
    const today = new Date();
    const inProgress = isCurrentMonthInProgress(results, today);
    const effective = computeEffectivePeriodMonths(1, today, inProgress);
    return { effectiveMonths: effective, isProrated: inProgress };
  }, [results]);

  // Scroll sur le volume ciblé
  useEffect(() => {
    if (!highlightedItem) return;
    const t = setTimeout(() => {
      const el = document.querySelector(
        `[data-highlight-id="volume:${highlightedItem}"]`
      );
      if (el && "scrollIntoView" in el) {
        (el as HTMLElement).scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 80);
    return () => clearTimeout(t);
  }, [highlightedItem]);

  const rows = results ? buildRows(results, category) : [];

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
        <h2 className="text-2xl font-bold text-foreground">Mes volumes</h2>
        {user && (
          <p className="mt-1 text-sm text-muted-foreground">
            {isProrated
              ? "Vos volumes du mois comparés à l'objectif à date — calculé au prorata du jour du mois."
              : "Vos volumes du mois comparés à l'objectif mensuel de votre profil."}
          </p>
        )}
      </header>

      {!results ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Aucune donnée disponible. Continuez votre saisie hebdomadaire pour
          voir vos volumes.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((row) => {
            const targetMonthly = Math.round(row.monthly);
            const targetToDate = Math.ceil(row.monthly * effectiveMonths);
            const rhythm = determineRhythmStatus(row.current, targetToDate);
            const sty = STATUS_STYLE[RHYTHM_STATUS_MAP[rhythm]];
            const Icon = sty.icon;
            const pct =
              targetToDate > 0
                ? Math.round((row.current / targetToDate) * 100)
                : 0;
            const isHighlighted = highlightedItem === row.key;
            return (
              <div
                key={row.key}
                data-highlight-id={`volume:${row.key}`}
                className={cn(
                  "rounded-xl border bg-card p-4 transition-all duration-300",
                  sty.ring,
                  isHighlighted &&
                    "scale-[1.02] ring-2 ring-primary shadow-lg animate-pulse"
                )}
              >
                <p className="text-xs text-muted-foreground">{row.label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {row.current}
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}
                    / {targetToDate}
                  </span>
                </p>
                {isProrated && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Mensuel : {targetMonthly}
                  </p>
                )}
                <span
                  className={cn(
                    "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                    sty.bg,
                    sty.color
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {pct}% — {RHYTHM_LABEL[rhythm]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
