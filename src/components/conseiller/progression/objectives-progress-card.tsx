"use client";

import Link from "next/link";
import { Target, ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { useUser } from "@/hooks/use-user";
import { useAllResults } from "@/hooks/use-results";
import { useAppStore } from "@/stores/app-store";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

function CircularGauge({
  pct,
  size = 110,
  stroke = 10,
  label,
  value,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  label: string;
  value: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = c * (1 - clamped / 100);
  const tone =
    clamped >= 100
      ? "stroke-emerald-500"
      : clamped >= 70
        ? "stroke-primary"
        : "stroke-orange-500";

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className={cn("transition-all duration-500", tone)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold tabular-nums text-foreground">
            {Math.round(clamped)}%
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-foreground">{label}</p>
      <p className="text-[11px] text-muted-foreground">{value}</p>
    </div>
  );
}

export function ObjectivesProgressCard() {
  const { user } = useUser();
  const allResults = useAllResults();
  const agencyObjective = useAppStore((s) => s.agencyObjective);

  const data = useMemo(() => {
    if (!user || !agencyObjective?.annualCA) return null;
    const target = agencyObjective.annualCA;
    const targetPerQuarter = target / 4;

    const now = new Date();
    const yStart = new Date(now.getFullYear(), 0, 1).getTime();
    const qStart = new Date(
      now.getFullYear(),
      Math.floor(now.getMonth() / 3) * 3,
      1
    ).getTime();
    const nowMs = now.getTime();

    let ytdCA = 0;
    let qtdCA = 0;
    for (const r of allResults) {
      if (r.userId !== user.id || r.periodType !== "month") continue;
      const ts = new Date(r.periodStart).getTime();
      const ca = r.ventes?.chiffreAffaires ?? 0;
      if (ts >= yStart && ts <= nowMs) ytdCA += ca;
      if (ts >= qStart && ts <= nowMs) qtdCA += ca;
    }

    const yearlyPct = target > 0 ? (ytdCA / target) * 100 : 0;
    const quarterPct =
      targetPerQuarter > 0 ? (qtdCA / targetPerQuarter) * 100 : 0;

    return {
      yearlyPct,
      quarterPct,
      ytdCA,
      qtdCA,
      targetAnnual: target,
      targetQuarter: targetPerQuarter,
    };
  }, [user, agencyObjective, allResults]);

  if (!data) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Target className="h-3.5 w-3.5" />
          Mes objectifs
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Aucun objectif annuel défini pour l'instant.
        </p>
        <Link
          href="/onboarding/gps"
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Définir mes objectifs
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Target className="h-3.5 w-3.5" />
        Mes objectifs
      </div>
      <h3 className="mt-2 text-lg font-bold text-foreground">
        Progression CA
      </h3>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <CircularGauge
          pct={data.yearlyPct}
          label="CA annuel"
          value={`${formatCurrency(data.ytdCA)} / ${formatCurrency(
            data.targetAnnual
          )}`}
        />
        <CircularGauge
          pct={data.quarterPct}
          label="CA trimestriel"
          value={`${formatCurrency(data.qtdCA)} / ${formatCurrency(
            data.targetQuarter
          )}`}
        />
      </div>
    </section>
  );
}
