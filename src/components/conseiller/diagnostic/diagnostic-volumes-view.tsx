"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, Check, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useResults } from "@/hooks/use-results";
import { CATEGORY_OBJECTIVES } from "@/lib/constants";
import type { PeriodResults } from "@/types/results";

const STATUS_STYLE = {
  ok: {
    icon: Check,
    label: "Surperf",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    ring: "border-emerald-500/30",
  },
  warning: {
    icon: AlertTriangle,
    label: "À surveiller",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    ring: "border-orange-500/30",
  },
  danger: {
    icon: X,
    label: "Sous-perf",
    color: "text-red-500",
    bg: "bg-red-500/10",
    ring: "border-red-500/30",
  },
} as const;

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
  target: number;
}

function status(actual: number, target: number): "ok" | "warning" | "danger" {
  if (target <= 0) return "warning";
  const pct = actual / target;
  if (pct >= 1.0) return "ok";
  if (pct >= 0.8) return "warning";
  return "danger";
}

function buildRows(results: PeriodResults, category: string): VolumeRow[] {
  const obj =
    CATEGORY_OBJECTIVES[category] ?? CATEGORY_OBJECTIVES.confirme;
  return [
    {
      key: "contactsTotaux",
      label: "Contacts",
      current: results.prospection.contactsTotaux,
      target: obj.estimations * 15,
    },
    {
      key: "rdvEstimation",
      label: "RDV estimation",
      current: results.prospection.rdvEstimation,
      target: obj.estimations,
    },
    {
      key: "estimationsRealisees",
      label: "Estimations",
      current: results.vendeurs.estimationsRealisees,
      target: obj.estimations,
    },
    {
      key: "mandatsSignes",
      label: "Mandats",
      current: results.vendeurs.mandatsSignes,
      target: obj.mandats,
    },
    {
      key: "nombreVisites",
      label: "Visites",
      current: results.acheteurs.nombreVisites,
      target: obj.visites,
    },
    {
      key: "offresRecues",
      label: "Offres",
      current: results.acheteurs.offresRecues,
      target: obj.offres,
    },
    {
      key: "compromisSignes",
      label: "Compromis",
      current: results.acheteurs.compromisSignes,
      target: obj.compromis,
    },
    {
      key: "actesSignes",
      label: "Actes",
      current: results.ventes.actesSignes,
      target: obj.actes,
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
            Vos volumes du mois comparés à l'objectif mensuel de votre profil.
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
            const s = status(row.current, row.target);
            const sty = STATUS_STYLE[s];
            const Icon = sty.icon;
            const pct =
              row.target > 0
                ? Math.round((row.current / row.target) * 100)
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
                    / {row.target}
                  </span>
                </p>
                <span
                  className={cn(
                    "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                    sty.bg,
                    sty.color
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {pct}% — {sty.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
