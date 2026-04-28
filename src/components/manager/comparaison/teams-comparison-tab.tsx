"use client";

import { useMemo, useState } from "react";
import {
  Users,
  ScrollText,
  Lock,
  Handshake,
  Lock as LockIcon,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useUser } from "@/hooks/use-user";
import { useAllResults } from "@/hooks/use-results";
import { aggregateResults } from "@/lib/aggregate-results";
import { computeExclusivityRate } from "@/lib/comparison";
import { formatCurrency } from "@/lib/formatters";
import { PeriodSelector } from "@/components/ui/period-selector";
import {
  COMPARISON_PERIOD_OPTIONS,
  formatPeriodRange,
  getPeriodBounds,
  type ComparisonPeriod,
} from "@/lib/date-periods";
import {
  MOCK_NXT_AGENCIES,
  MOCK_NXT_CONSEILLERS,
} from "@/data/mock-nxt-network";
import type { ScopeOverride } from "@/types/scope-override";

// MOCK NXT cross-agence — à raccorder DB en production
// Représente d'autres équipes du réseau NXT, anonymisées par construction.
// Valeurs réalistes pour ranking : mandats / % exclusivité / compromis.
interface MockNxtTeam {
  syntheticId: string;
  mandatsSignes: number;
  exclusivityRate: number; // 0-100
  compromisSignes: number;
}

const MOCK_NXT_TEAMS: MockNxtTeam[] = [
  { syntheticId: "nxt-team-a", mandatsSignes: 24, exclusivityRate: 72, compromisSignes: 18 },
  { syntheticId: "nxt-team-b", mandatsSignes: 18, exclusivityRate: 65, compromisSignes: 14 },
  { syntheticId: "nxt-team-c", mandatsSignes: 16, exclusivityRate: 58, compromisSignes: 11 },
  { syntheticId: "nxt-team-d", mandatsSignes: 14, exclusivityRate: 52, compromisSignes: 10 },
  { syntheticId: "nxt-team-e", mandatsSignes: 11, exclusivityRate: 48, compromisSignes: 8 },
  { syntheticId: "nxt-team-f", mandatsSignes: 9, exclusivityRate: 41, compromisSignes: 7 },
  { syntheticId: "nxt-team-g", mandatsSignes: 7, exclusivityRate: 35, compromisSignes: 5 },
  { syntheticId: "nxt-team-h", mandatsSignes: 5, exclusivityRate: 28, compromisSignes: 4 },
];

type KpiKey = "mandats" | "exclusivite" | "compromis" | "ca";
type CompareLevel = "team" | "agency" | "individual";

interface KpiConfig {
  key: KpiKey;
  label: string;
  icon: typeof ScrollText;
  unit: string; // suffix when displayed (ex: "" / "%")
  format: (v: number) => string;
}

const KPIS_BASE: KpiConfig[] = [
  {
    key: "mandats",
    label: "Mandats signés",
    icon: ScrollText,
    unit: "",
    format: (v) => `${Math.round(v)}`,
  },
  {
    key: "exclusivite",
    label: "% Exclusivité",
    icon: Lock,
    unit: "%",
    format: (v) => `${Math.round(v)}%`,
  },
  {
    key: "compromis",
    label: "Compromis signés",
    icon: Handshake,
    unit: "",
    format: (v) => `${Math.round(v)}`,
  },
];

const KPI_CA: KpiConfig = {
  key: "ca",
  label: "Chiffre d'affaires",
  icon: Wallet,
  unit: "€",
  format: (v) => formatCurrency(v),
};

interface RankedEntity {
  id: string;
  isMine: boolean;
  value: number;
}

function buildRanking(myValue: number, mockValues: number[]): RankedEntity[] {
  const all: RankedEntity[] = [
    { id: "me", isMine: true, value: myValue },
    ...mockValues.map((v, i) => ({ id: `nxt-${i}`, isMine: false, value: v })),
  ];
  return all.sort((a, b) => b.value - a.value);
}

interface TeamsComparisonTabProps {
  /** Override de scope (Directeur). Sans override, lit currentUser via useUser. */
  scopeOverride?: ScopeOverride;
  /**
   * Niveau de comparaison cross-agence NXT :
   * - "team" (défaut) : mon équipe (effectiveTeamId) vs MOCK_NXT_TEAMS — comportement Manager natif
   * - "agency"        : mon agence (effectiveInstitutionId) vs MOCK_NXT_AGENCIES — 4 KPIs
   * - "individual"    : mon conseiller (effectiveUserId) vs MOCK_NXT_CONSEILLERS — 3 KPIs
   */
  compareLevel?: CompareLevel;
}

export function TeamsComparisonTab({
  scopeOverride,
  compareLevel = "team",
}: TeamsComparisonTabProps = {}) {
  const { user } = useUser();
  const users = useAppStore((s) => s.users);
  const allResults = useAllResults();

  const [period, setPeriod] = useState<ComparisonPeriod>("mois");
  const periodBounds = useMemo(() => getPeriodBounds(period), [period]);

  const effectiveTeamId = scopeOverride?.teamId ?? user?.teamId;
  const effectiveInstitutionId =
    scopeOverride?.institutionId ?? user?.institutionId;
  const effectiveUserId = scopeOverride?.userId ?? user?.id;

  // Pool d'IDs conseillers selon le niveau de comparaison
  const myValues = useMemo<Record<KpiKey, number>>(() => {
    let userIds: string[] = [];
    if (compareLevel === "team") {
      if (!effectiveTeamId) return { mandats: 0, exclusivite: 0, compromis: 0, ca: 0 };
      userIds = users
        .filter((u) => u.teamId === effectiveTeamId && u.role === "conseiller")
        .map((u) => u.id);
    } else if (compareLevel === "agency") {
      if (!effectiveInstitutionId) return { mandats: 0, exclusivite: 0, compromis: 0, ca: 0 };
      userIds = users
        .filter(
          (u) =>
            u.institutionId === effectiveInstitutionId && u.role === "conseiller",
        )
        .map((u) => u.id);
    } else {
      if (!effectiveUserId) return { mandats: 0, exclusivite: 0, compromis: 0, ca: 0 };
      userIds = [effectiveUserId];
    }

    const startMs = periodBounds.start.getTime();
    const endMs = periodBounds.end.getTime();
    const inPeriod = allResults.filter((r) => {
      if (!userIds.includes(r.userId)) return false;
      const ts = new Date(r.periodStart).getTime();
      return ts >= startMs && ts <= endMs;
    });
    const agg = aggregateResults(inPeriod);
    return {
      mandats: agg?.vendeurs.mandatsSignes ?? 0,
      exclusivite: agg ? computeExclusivityRate(agg) : 0,
      compromis: agg?.acheteurs.compromisSignes ?? 0,
      ca: agg?.ventes.chiffreAffaires ?? 0,
    };
  }, [
    users,
    allResults,
    effectiveTeamId,
    effectiveInstitutionId,
    effectiveUserId,
    compareLevel,
    periodBounds,
  ]);

  // Liste des KPIs à afficher (4 en agence pour exposer le CA, 3 sinon)
  const activeKpis: KpiConfig[] = useMemo(
    () => (compareLevel === "agency" ? [...KPIS_BASE, KPI_CA] : KPIS_BASE),
    [compareLevel],
  );

  // Helper : valeur mock pour un KPI donné selon compareLevel
  function getMockValues(kpiKey: KpiKey): number[] {
    if (compareLevel === "agency") {
      return MOCK_NXT_AGENCIES.map((a) =>
        kpiKey === "mandats"
          ? a.mandatsSignes
          : kpiKey === "exclusivite"
            ? a.exclusivityRate
            : kpiKey === "compromis"
              ? a.compromisSignes
              : a.chiffreAffaires,
      );
    }
    if (compareLevel === "individual") {
      return MOCK_NXT_CONSEILLERS.map((c) =>
        kpiKey === "mandats"
          ? c.mandatsSignes
          : kpiKey === "exclusivite"
            ? c.exclusivityRate
            : kpiKey === "compromis"
              ? c.compromisSignes
              : 0, // CA non affiché en mode individual (KPIS_BASE seulement)
      );
    }
    // team
    return MOCK_NXT_TEAMS.map((t) =>
      kpiKey === "mandats"
        ? t.mandatsSignes
        : kpiKey === "exclusivite"
          ? t.exclusivityRate
          : kpiKey === "compromis"
            ? t.compromisSignes
            : 0,
    );
  }

  // Libellés contextualisés selon compareLevel
  const meLabel =
    compareLevel === "agency"
      ? "Mon agence"
      : compareLevel === "individual"
        ? "Mon conseiller"
        : "Mon équipe";
  const mockLabelPrefix =
    compareLevel === "agency"
      ? "Agence"
      : compareLevel === "individual"
        ? "Conseiller"
        : "Équipe";
  const headerSubject =
    compareLevel === "agency"
      ? "votre agence"
      : compareLevel === "individual"
        ? "votre conseiller"
        : "votre équipe";
  const totalLabel =
    compareLevel === "agency"
      ? "agences NXT"
      : compareLevel === "individual"
        ? "conseillers NXT"
        : "équipes NXT";

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <Users className="h-3.5 w-3.5" />
        Classement NXT
      </div>
      <h2 className="mb-3 text-3xl font-bold text-foreground">Comparaison anonyme NXT</h2>
      <p className="mb-6 max-w-2xl text-muted-foreground">
        Comparez {headerSubject} au reste du réseau NXT sur les KPIs essentiels — sans nom
        d&apos;agence ni de collaborateur.
      </p>

      {/* Bandeau transparence anonymisation */}
      <div className="mb-6 flex items-start gap-2 rounded-lg bg-blue-500/10 px-4 py-2.5 text-xs text-blue-500">
        <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Données anonymisées pour préserver la confidentialité du réseau NXT.</span>
      </div>

      {/* Période */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Période :</span>
        <PeriodSelector options={COMPARISON_PERIOD_OPTIONS} value={period} onChange={setPeriod} />
        <span className="text-xs text-muted-foreground">({formatPeriodRange(periodBounds)})</span>
      </div>

      {/* Cards stackées verticalement, une par KPI */}
      <div className="space-y-4">
        {activeKpis.map((kpi) => {
          const myValue = myValues[kpi.key];
          const mockValues = getMockValues(kpi.key);
          return (
            <KpiCard
              key={kpi.key}
              kpi={kpi}
              myValue={myValue}
              mockValues={mockValues}
              meLabel={meLabel}
              mockLabelPrefix={mockLabelPrefix}
              totalLabel={totalLabel}
            />
          );
        })}
      </div>

      {/* Bandeau mock pour transparence dev */}
      <div className="mt-6 flex items-center gap-2 rounded-lg bg-orange-500/10 px-4 py-2 text-xs text-orange-500">
        <AlertTriangle className="h-3.5 w-3.5" />
        Données NXT cross-agence simulées — raccordement DB à venir.
      </div>
    </section>
  );
}

interface KpiCardProps {
  kpi: KpiConfig;
  myValue: number;
  mockValues: number[];
  meLabel: string;
  mockLabelPrefix: string;
  totalLabel: string;
}

function KpiCard({
  kpi,
  myValue,
  mockValues,
  meLabel,
  mockLabelPrefix,
  totalLabel,
}: KpiCardProps) {
  const Icon = kpi.icon;
  const ranking = useMemo(() => buildRanking(myValue, mockValues), [myValue, mockValues]);
  const myIndex = ranking.findIndex((t) => t.isMine);
  const myPosition = myIndex + 1;
  const totalEntities = ranking.length;
  const sumOthers = mockValues.reduce((a, b) => a + b, 0);
  const avgNxt = mockValues.length > 0 ? sumOthers / mockValues.length : 0;
  const deltaPct =
    avgNxt > 0 ? Math.round(((myValue - avgNxt) / avgNxt) * 100) : 0;
  const isAboveAvg = myValue > avgNxt;
  const isBelowAvg = myValue < avgNxt;

  // Mini ranking : top 3 + Mon entité si hors top 3
  const top3 = ranking.slice(0, 3);
  const showMine = !top3.some((t) => t.isMine);

  function displayName(entity: RankedEntity, indexInRanking: number): string {
    if (entity.isMine) return meLabel;
    return `${mockLabelPrefix} #${indexInRanking + 1}`;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left — KPI + ma valeur + position + écart */}
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">
              {kpi.format(myValue)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Position{" "}
              <span className="font-semibold text-foreground">
                #{myPosition}
              </span>{" "}
              sur {totalEntities} {totalLabel}
            </p>
            <p
              className={cn(
                "mt-1 text-xs font-semibold tabular-nums",
                isAboveAvg
                  ? "text-emerald-500"
                  : isBelowAvg
                    ? "text-red-500"
                    : "text-muted-foreground",
              )}
            >
              {deltaPct > 0 ? "+" : ""}
              {deltaPct}% vs moyenne NXT ({kpi.format(avgNxt)})
            </p>
          </div>
        </div>

        {/* Right — mini ranking (top 3 + Mon entité si hors top 3) */}
        <div className="flex flex-col gap-1.5 lg:max-w-xs lg:flex-1">
          {top3.map((entity) => {
            const idx = ranking.findIndex((t) => t.id === entity.id);
            return (
              <RankRow
                key={entity.id}
                rank={idx + 1}
                name={displayName(entity, idx)}
                value={kpi.format(entity.value)}
                isMine={entity.isMine}
              />
            );
          })}
          {showMine && (
            <>
              <div className="my-0.5 border-t border-dashed border-border/60" />
              <RankRow
                rank={myPosition}
                name={meLabel}
                value={kpi.format(myValue)}
                isMine
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RankRow({
  rank,
  name,
  value,
  isMine,
}: {
  rank: number;
  name: string;
  value: string;
  isMine: boolean;
}) {
  const medal =
    rank === 1
      ? "bg-yellow-500/20 text-yellow-500"
      : rank === 2
        ? "bg-gray-400/20 text-gray-400"
        : rank === 3
          ? "bg-orange-600/20 text-orange-600"
          : "bg-muted text-muted-foreground";
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs",
        isMine && "bg-primary/10",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
            medal,
          )}
        >
          {rank}
        </span>
        <span
          className={cn(
            "truncate",
            isMine ? "font-semibold text-foreground" : "text-muted-foreground",
          )}
        >
          {name}
        </span>
      </div>
      <span
        className={cn(
          "shrink-0 font-bold tabular-nums",
          isMine ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
