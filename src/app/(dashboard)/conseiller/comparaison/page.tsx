"use client";

import { useState, useMemo } from "react";
import { Users } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useAllResults } from "@/hooks/use-results";
import { useAppStore } from "@/stores/app-store";
import { aggregateResults } from "@/lib/aggregate-results";
import { computeAllRatios } from "@/lib/ratios";
import { getGlobalScore } from "@/lib/scoring";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  buildVolumeAxes,
  buildEfficiencyAxes,
  buildProfileResults,
  extractVerdict,
  normalizeAxes,
} from "@/lib/comparison";
import {
  getPeriodBounds,
  formatPeriodRange,
  COMPARISON_PERIOD_OPTIONS,
  type ComparisonPeriod,
} from "@/lib/date-periods";
import { PeriodSelector } from "@/components/ui/period-selector";
import { ComparisonRadar } from "@/components/charts/comparison-radar";
import { DPIComparisonView } from "@/components/dpi/dpi-comparison-view";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  ComparaisonModeSelector,
  type CompareMode,
} from "@/components/conseiller/comparaison/comparaison-mode-selector";
import { ComparisonInsightCard } from "@/components/conseiller/comparaison/comparison-insight-card";
import type { UserCategory, User } from "@/types/user";
import type { PeriodResults } from "@/types/results";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

// Map des axis.id ratios → ExpertiseRatioId pour le bouton "Travailler ce point"
const AXIS_TO_EXPERTISE: Record<string, ExpertiseRatioId> = {
  contactsToEstim: "contacts_estimations",
  estimToMandat: "estimations_mandats",
  exclu: "pct_exclusivite",
  acheteursToVisite: "acheteurs_tournee",
  visiteToOffre: "visites_offres",
  offreToCompromis: "offres_compromis",
  compromisToActe: "compromis_actes",
};

const EXPERT_PROFILES: {
  id: string;
  label: string;
  description: string;
  category: UserCategory;
}[] = [
  {
    id: "expert_volume",
    label: "Expert volumétrie",
    description: "Forte intensité — beaucoup de contacts, mandats et visites.",
    category: "expert",
  },
  {
    id: "expert_ratios",
    label: "Expert ratios",
    description: "Excellents taux de transformation à chaque étape.",
    category: "expert",
  },
  {
    id: "top10_nxt",
    label: "Top 10% NXT",
    description: "Mix premium — référence du réseau.",
    category: "expert",
  },
  {
    id: "equilibre",
    label: "Profil équilibré",
    description: "Confirmé conforme aux objectifs métier de la catégorie.",
    category: "confirme",
  },
];

export default function ConseillerComparaisonPage() {
  const { user } = useUser();
  const allResults = useAllResults();
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const users = useAppStore((s) => s.users);

  const [mode, setMode] = useState<CompareMode>("confrere");
  const [period, setPeriod] = useState<ComparisonPeriod>("mois");
  const periodBounds = useMemo(() => getPeriodBounds(period), [period]);

  const otherUsers = useMemo(
    () => users.filter((u) => u.id !== user?.id && u.role === "conseiller"),
    [users, user]
  );
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>(
    () => otherUsers[0]?.id ?? ""
  );
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    EXPERT_PROFILES[0].id
  );

  const myAggregated = useMemo<PeriodResults | null>(() => {
    if (!user) return null;
    const startMs = periodBounds.start.getTime();
    const endMs = periodBounds.end.getTime();
    const inPeriod = allResults.filter((r) => {
      if (r.userId !== user.id) return false;
      const ts = new Date(r.periodStart).getTime();
      return ts >= startMs && ts <= endMs;
    });
    return aggregateResults(inPeriod);
  }, [user, allResults, periodBounds]);

  const otherAggregated = useMemo<PeriodResults | null>(() => {
    if (mode === "confrere") {
      if (!selectedAdvisorId) return null;
      const startMs = periodBounds.start.getTime();
      const endMs = periodBounds.end.getTime();
      const inPeriod = allResults.filter((r) => {
        if (r.userId !== selectedAdvisorId) return false;
        const ts = new Date(r.periodStart).getTime();
        return ts >= startMs && ts <= endMs;
      });
      return aggregateResults(inPeriod);
    }
    if (mode === "profil") {
      const profile = EXPERT_PROFILES.find((p) => p.id === selectedProfileId);
      if (!profile) return null;
      return buildProfileResults(
        profile.category,
        ratioConfigs,
        periodBounds.monthsInPeriod
      );
    }
    return null;
  }, [
    mode,
    selectedAdvisorId,
    selectedProfileId,
    allResults,
    periodBounds,
    ratioConfigs,
  ]);

  const otherUser: User | null = useMemo(() => {
    if (mode !== "confrere") return null;
    return otherUsers.find((u) => u.id === selectedAdvisorId) ?? null;
  }, [mode, otherUsers, selectedAdvisorId]);

  const otherLabel = useMemo(() => {
    if (mode === "confrere" && otherUser) {
      return `${otherUser.firstName} ${otherUser.lastName}`.trim();
    }
    if (mode === "profil") {
      return (
        EXPERT_PROFILES.find((p) => p.id === selectedProfileId)?.label ??
        "Profil"
      );
    }
    return "Comparaison";
  }, [mode, otherUser, selectedProfileId]);

  const myVerdict = extractVerdict(myAggregated);
  const otherVerdict = extractVerdict(otherAggregated);
  const caDelta = myVerdict.ca - otherVerdict.ca;
  const caDeltaPct =
    otherVerdict.ca > 0 ? Math.round((caDelta / otherVerdict.ca) * 100) : 0;

  // PR3.7.3 Q5 : pondération mensuelle automatique sur les VOLUMES uniquement.
  //   - Semaine (monthsInPeriod=0.25) : ×4.33 (projection mensuelle)
  //   - Mois (=1) : valeur brute
  //   - Trimestre (=3) : ÷3
  //   - Semestre (=6) : ÷6
  //   - Année (=12) : ÷12
  // Les ratios (taux de transformation) restent calculés sur la période,
  // pas de division.
  const monthlyFactor = useMemo(() => {
    const m = periodBounds.monthsInPeriod;
    if (m <= 0) return 1;
    if (m < 1) return 4.33; // semaine -> projection mensuelle 4.33×
    return 1 / m;
  }, [periodBounds]);

  const rawVolumeAxes = useMemo(
    () => buildVolumeAxes(myAggregated, otherAggregated),
    [myAggregated, otherAggregated]
  );
  const volumeAxes = useMemo(
    () =>
      rawVolumeAxes.map((a) => ({
        ...a,
        me: Math.round(a.me * monthlyFactor),
        other: Math.round(a.other * monthlyFactor),
      })),
    [rawVolumeAxes, monthlyFactor]
  );
  const ratioAxes = useMemo(
    () => buildEfficiencyAxes(myAggregated, otherAggregated),
    [myAggregated, otherAggregated]
  );
  const normalizedVolumes = useMemo(
    () => normalizeAxes(volumeAxes),
    [volumeAxes]
  );
  const normalizedRatios = useMemo(() => normalizeAxes(ratioAxes), [ratioAxes]);

  const meDisplayName = user
    ? `${user.firstName} ${user.lastName}`.trim() || "Moi"
    : "Moi";

  const showCompareView = mode === "confrere" || mode === "profil";

  return (
    <div className="space-y-6 pb-12">
      <header className="mx-auto max-w-6xl px-4 pt-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Users className="h-3.5 w-3.5" />
          Ma comparaison
        </div>
        <h1 className="text-3xl font-bold text-foreground">Ma comparaison</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Mesurez-vous à un confrère, un profil expert, le classement NXT ou un
          DPI — pour identifier le levier qui fait la différence.
        </p>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4">
        <ComparaisonModeSelector value={mode} onChange={setMode} />

        {showCompareView && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
            {mode === "confrere" ? (
              <select
                value={selectedAdvisorId}
                onChange={(e) => setSelectedAdvisorId(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {otherUsers.length === 0 ? (
                  <option value="">Aucun autre conseiller</option>
                ) : (
                  otherUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ·{" "}
                      {CATEGORY_LABELS[u.category] ?? u.category}
                    </option>
                  ))
                )}
              </select>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {EXPERT_PROFILES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProfileId(p.id)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-all",
                      selectedProfileId === p.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:border-primary/40"
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {p.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.description}
                    </p>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Période :</span>
              <PeriodSelector
                options={COMPARISON_PERIOD_OPTIONS}
                value={period}
                onChange={setPeriod}
              />
            </div>
          </div>
        )}

        {showCompareView && myAggregated && otherAggregated && (
          <>
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Verdict — {formatPeriodRange(periodBounds)}
                </h2>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <VerdictBlock
                  name={meDisplayName}
                  verdict={myVerdict}
                  primary
                />
                <VerdictBlock name={otherLabel} verdict={otherVerdict} />
              </div>
              <p className="mt-4 text-center text-sm">
                <span className="text-muted-foreground">Écart CA : </span>
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    caDelta > 0
                      ? "text-emerald-500"
                      : caDelta < 0
                        ? "text-red-500"
                        : "text-muted-foreground"
                  )}
                >
                  {caDelta > 0 ? "+" : ""}
                  {formatCurrency(caDelta)} ({caDeltaPct > 0 ? "+" : ""}
                  {caDeltaPct}%)
                </span>
              </p>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">Volumes</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Volumes ramenés à une base mensuelle moyenne pour comparer des
                périodes différentes — plus le polygone est grand, plus
                l'activité est intense.
              </p>
              <div className="mt-4 flex justify-center">
                <ComparisonRadar
                  axes={normalizedVolumes.map((a) => ({
                    id: a.id,
                    label: a.label,
                    score: a.meNormalized,
                  }))}
                  overlayAxes={normalizedVolumes.map((a) => ({
                    id: a.id,
                    label: a.label,
                    score: a.otherNormalized,
                  }))}
                  rawAxes={normalizedVolumes.map((a) => ({
                    me: a.meRaw,
                    other: a.otherRaw,
                  }))}
                  primaryLabel={meDisplayName}
                  overlayLabel={otherLabel}
                  primaryColor="#3375FF"
                  overlayColor="#FF8A3D"
                  showLabels
                />
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">Ratios</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Taux de transformation à chaque étape — plus le polygone est
                grand, meilleurs sont les ratios.
              </p>
              <div className="mt-4 flex justify-center">
                <ComparisonRadar
                  axes={normalizedRatios.map((a) => ({
                    id: a.id,
                    label: a.label,
                    score: a.meNormalized,
                  }))}
                  overlayAxes={normalizedRatios.map((a) => ({
                    id: a.id,
                    label: a.label,
                    score: a.otherNormalized,
                  }))}
                  rawAxes={normalizedRatios.map((a) => ({
                    me: a.meRaw,
                    other: a.otherRaw,
                    unit: "%",
                  }))}
                  primaryLabel={meDisplayName}
                  overlayLabel={otherLabel}
                  primaryColor="#3375FF"
                  overlayColor="#FF8A3D"
                  showLabels
                />
              </div>
            </section>

            <ComparisonInsightCard
              otherLabel={otherLabel}
              ratioAxes={ratioAxes}
              axisToExpertise={AXIS_TO_EXPERTISE}
            />
          </>
        )}

        {showCompareView && (!myAggregated || !otherAggregated) && (
          <div className="rounded-xl border border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            Aucune donnée disponible pour cette période. Essayez d'élargir
            (Trimestre, Semestre, Année).
          </div>
        )}

        {mode === "classement" && (
          <ClassementView
            users={users}
            allResults={allResults}
            ratioConfigs={ratioConfigs}
            currentUserId={user?.id}
            periodBounds={periodBounds}
          />
        )}

        {mode === "dpi" && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              Comparaison DPI
            </h2>
            <DPIComparisonView />
          </section>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function VerdictBlock({
  name,
  verdict,
  primary,
}: {
  name: string;
  verdict: { ca: number; actes: number; mandats: number };
  primary?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        primary
          ? "border-primary/30 bg-primary/5"
          : "border-orange-500/30 bg-orange-500/5"
      )}
    >
      <p className="text-sm font-semibold text-foreground">{name}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
        {formatCurrency(verdict.ca)}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <span>{verdict.actes} actes</span>
        <span>{verdict.mandats} mandats</span>
      </div>
    </div>
  );
}

// ── Mode "Classement NXT" ──────────────────────────────────────────────

function ClassementView({
  users,
  allResults,
  ratioConfigs,
  currentUserId,
  periodBounds,
}: {
  users: User[];
  allResults: ReturnType<typeof useAllResults>;
  ratioConfigs: ReturnType<typeof useAppStore.getState>["ratioConfigs"];
  currentUserId?: string;
  periodBounds: ReturnType<typeof getPeriodBounds>;
}) {
  const ranking = useMemo(() => {
    const startMs = periodBounds.start.getTime();
    const endMs = periodBounds.end.getTime();
    return users
      .filter((u) => u.role === "conseiller")
      .map((u) => {
        const inPeriod = allResults.filter((r) => {
          if (r.userId !== u.id) return false;
          const ts = new Date(r.periodStart).getTime();
          return ts >= startMs && ts <= endMs;
        });
        const aggregated = aggregateResults(inPeriod);
        const computed = aggregated
          ? computeAllRatios(aggregated, u.category, ratioConfigs)
          : [];
        const score = computed.length > 0 ? getGlobalScore(computed) : null;
        return {
          user: u,
          score: score?.score ?? 0,
          ca: aggregated?.ventes.chiffreAffaires ?? 0,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [users, allResults, ratioConfigs, periodBounds]);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-1 text-sm font-semibold text-foreground">
        Classement NXT
      </h2>
      <p className="text-xs text-muted-foreground">
        Anonymisé — initiales et score global. Votre ligne est en évidence.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-2 text-left font-medium">Rang</th>
              <th className="px-2 py-2 text-left font-medium">Conseiller</th>
              <th className="px-2 py-2 text-right font-medium">Score</th>
              <th className="px-2 py-2 text-right font-medium">CA période</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row, idx) => {
              const isMe = row.user.id === currentUserId;
              const initials =
                `${row.user.firstName[0] ?? ""}${row.user.lastName[0] ?? ""}`.toUpperCase();
              return (
                <tr
                  key={row.user.id}
                  className={cn(
                    "border-b border-border last:border-b-0",
                    isMe && "bg-primary/5 ring-1 ring-primary/30"
                  )}
                >
                  <td className="px-2 py-3 text-sm font-bold text-foreground">
                    #{idx + 1}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        name={`${row.user.firstName} ${row.user.lastName}`}
                        size="sm"
                      />
                      <span className="text-sm text-foreground">
                        {isMe ? `${initials} (vous)` : initials}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right text-sm font-bold tabular-nums text-foreground">
                    {row.score}
                  </td>
                  <td className="px-2 py-3 text-right text-sm tabular-nums text-muted-foreground">
                    {formatCurrency(row.ca)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
