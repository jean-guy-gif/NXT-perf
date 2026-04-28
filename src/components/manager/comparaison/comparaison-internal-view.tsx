"use client";

import { useMemo, useState } from "react";
import { Trophy, Zap, Gauge, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import { useUser } from "@/hooks/use-user";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ComparisonRadar } from "@/components/charts/comparison-radar";
import { PeriodSelector } from "@/components/ui/period-selector";
import { aggregateResults } from "@/lib/aggregate-results";
import {
  COMPARISON_PERIOD_OPTIONS,
  formatPeriodRange,
  getPeriodBounds,
  type ComparisonPeriod,
} from "@/lib/date-periods";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
import {
  buildEfficiencyAxes,
  buildProfileResults,
  buildVolumeAxes,
  extractVerdict,
  normalizeAxes,
  type Axis,
} from "@/lib/comparison";
import type { PeriodResults } from "@/types/results";
import type { User, UserCategory } from "@/types/user";
import type { ScopeOverride } from "@/types/scope-override";

type CompareTeamMode = "team" | "profile";
type CompareIndivMode = "advisor" | "profile";

interface ComparaisonInternalViewProps {
  /** When defined → individual scope dispatcher (Pierre vs autre/profil). When null → team scope. */
  conseiller: User | null;
  /** Override de scope (Directeur). Appliqué uniquement à TeamView (IndivView est pur). */
  scopeOverride?: ScopeOverride;
}

export function ComparaisonInternalView({
  conseiller,
  scopeOverride,
}: ComparaisonInternalViewProps) {
  if (conseiller) {
    return <IndivView conseiller={conseiller} />;
  }
  return <TeamView scopeOverride={scopeOverride} />;
}

// ─── COLLECTIF — équipe agrégée vs autre équipe / profil ────────────────────

function TeamView({ scopeOverride }: { scopeOverride?: ScopeOverride } = {}) {
  const { user } = useUser();
  const users = useAppStore((s) => s.users);
  const teamInfos = useAppStore((s) => s.teamInfos);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const allResults = useAllResults();

  const myInstitutionId = scopeOverride?.institutionId ?? user?.institutionId;
  const myTeamId = scopeOverride?.teamId ?? user?.teamId;

  // Team list of the same institution, excluding mine
  const otherTeams = useMemo(() => {
    const fromInfos = teamInfos.filter(
      (t) => t.institutionId === myInstitutionId && t.id !== myTeamId,
    );
    if (fromInfos.length > 0) return fromInfos;
    // Fallback: derive from users
    const teamIds = new Set<string>();
    users.forEach((u) => {
      if (u.institutionId === myInstitutionId && u.teamId && u.teamId !== myTeamId) {
        teamIds.add(u.teamId);
      }
    });
    return Array.from(teamIds).map((tid) => {
      const mgr = users.find(
        (u) => u.teamId === tid && (u.role === "manager" || u.role === "directeur"),
      );
      return {
        id: tid,
        name: mgr ? `Équipe de ${mgr.firstName}` : tid,
        institutionId: myInstitutionId ?? "",
        managerId: mgr?.id ?? "",
        inviteCode: "",
      };
    });
  }, [teamInfos, users, myInstitutionId, myTeamId]);

  const [mode, setMode] = useState<CompareTeamMode>("team");
  const [otherTeamId, setOtherTeamId] = useState<string>(otherTeams[0]?.id ?? "");
  const [profile, setProfile] = useState<UserCategory>("expert");
  const [period, setPeriod] = useState<ComparisonPeriod>("mois");
  const periodBounds = useMemo(() => getPeriodBounds(period), [period]);

  // My team aggregated in period
  const myTeamUserIds = useMemo(
    () => users.filter((u) => u.teamId === myTeamId && u.role === "conseiller").map((u) => u.id),
    [users, myTeamId],
  );
  const myAgg = useMemo(() => {
    const startMs = periodBounds.start.getTime();
    const endMs = periodBounds.end.getTime();
    const inPeriod = allResults.filter((r) => {
      if (!myTeamUserIds.includes(r.userId)) return false;
      const ts = new Date(r.periodStart).getTime();
      return ts >= startMs && ts <= endMs;
    });
    return aggregateResults(inPeriod);
  }, [allResults, myTeamUserIds, periodBounds]);

  const otherTeamUserIds = useMemo(
    () => users.filter((u) => u.teamId === otherTeamId && u.role === "conseiller").map((u) => u.id),
    [users, otherTeamId],
  );
  const otherTeamAgg = useMemo(() => {
    if (mode !== "team" || !otherTeamId) return null;
    const startMs = periodBounds.start.getTime();
    const endMs = periodBounds.end.getTime();
    const inPeriod = allResults.filter((r) => {
      if (!otherTeamUserIds.includes(r.userId)) return false;
      const ts = new Date(r.periodStart).getTime();
      return ts >= startMs && ts <= endMs;
    });
    return aggregateResults(inPeriod);
  }, [mode, allResults, otherTeamUserIds, otherTeamId, periodBounds]);

  // For profile mode, scale × team size for fairness
  const teamSize = Math.max(1, myTeamUserIds.length);
  const effectiveOther: PeriodResults | null = useMemo(() => {
    if (mode === "team") return otherTeamAgg;
    const single = buildProfileResults(profile, ratioConfigs, periodBounds.monthsInPeriod);
    return scaleResults(single, teamSize);
  }, [mode, otherTeamAgg, profile, ratioConfigs, periodBounds, teamSize]);

  const myTeamName = useMemo(() => {
    const info = teamInfos.find((t) => t.id === myTeamId);
    if (info) return info.name;
    // Avec override (Directeur), `user` est le Directeur → son prénom n'est pas
    // pertinent comme fallback. On dérive depuis le manager de l'équipe ciblée.
    if (scopeOverride && myTeamId) {
      const mgr = users.find((u) => u.teamId === myTeamId && u.role === "manager");
      if (mgr) return `Équipe de ${mgr.firstName}`;
    }
    return user ? `Équipe de ${user.firstName}` : "Mon équipe";
  }, [teamInfos, myTeamId, user, users, scopeOverride]);

  const otherDisplayName =
    mode === "team"
      ? otherTeams.find((t) => t.id === otherTeamId)?.name ?? "Autre équipe"
      : `Profil ${CATEGORY_LABELS[profile]}`;

  const hasData = myAgg !== null && (mode !== "team" || otherTeamAgg !== null);

  return (
    <SharedLayout
      meName={myTeamName}
      meAvatar={undefined}
      otherName={otherDisplayName}
      otherAvatar={undefined}
      meResults={myAgg}
      otherResults={effectiveOther}
      hasData={hasData}
      period={period}
      setPeriod={setPeriod}
      periodBoundsLabel={formatPeriodRange(periodBounds)}
      headerH2="Mesurez votre équipe à une autre équipe ou à un profil cible"
      headerIntro="Choisissez une équipe ou un profil et la période pour faire apparaître l'écart en CA, en volume et en efficacité métier."
      controlBar={
        <>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode("team")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "team"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Avec une équipe
            </button>
            <button
              type="button"
              onClick={() => setMode("profile")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "profile"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Avec un profil
            </button>
          </div>
          {mode === "team" &&
            (otherTeams.length === 0 ? (
              <span className="text-xs italic text-muted-foreground">
                Aucune autre équipe dans votre agence
              </span>
            ) : (
              <select
                value={otherTeamId}
                onChange={(e) => setOtherTeamId(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                {otherTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            ))}
          {mode === "profile" && (
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value as UserCategory)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              {(["debutant", "confirme", "expert"] as UserCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]} (×{teamSize})
                </option>
              ))}
            </select>
          )}
        </>
      }
    />
  );
}

// ─── INDIVIDUEL — conseiller cible vs autre conseiller / profil ─────────────

function IndivView({ conseiller }: { conseiller: User }) {
  const users = useAppStore((s) => s.users);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const allResults = useAllResults();

  const otherUsers = useMemo(
    () => users.filter((u) => u.id !== conseiller.id && u.role === "conseiller"),
    [users, conseiller.id],
  );

  const [mode, setMode] = useState<CompareIndivMode>("advisor");
  const [otherAdvisorId, setOtherAdvisorId] = useState<string>(otherUsers[0]?.id ?? "");
  const [profile, setProfile] = useState<UserCategory>("expert");
  const [period, setPeriod] = useState<ComparisonPeriod>("mois");
  const periodBounds = useMemo(() => getPeriodBounds(period), [period]);

  const conseillerAgg = useMemo(() => {
    const startMs = periodBounds.start.getTime();
    const endMs = periodBounds.end.getTime();
    const inPeriod = allResults.filter((r) => {
      if (r.userId !== conseiller.id) return false;
      const ts = new Date(r.periodStart).getTime();
      return ts >= startMs && ts <= endMs;
    });
    return aggregateResults(inPeriod);
  }, [allResults, conseiller.id, periodBounds]);

  const otherAdvisorAgg = useMemo(() => {
    if (mode !== "advisor" || !otherAdvisorId) return null;
    const startMs = periodBounds.start.getTime();
    const endMs = periodBounds.end.getTime();
    const inPeriod = allResults.filter((r) => {
      if (r.userId !== otherAdvisorId) return false;
      const ts = new Date(r.periodStart).getTime();
      return ts >= startMs && ts <= endMs;
    });
    return aggregateResults(inPeriod);
  }, [mode, allResults, otherAdvisorId, periodBounds]);

  const effectiveOther: PeriodResults | null = useMemo(() => {
    if (mode === "advisor") return otherAdvisorAgg;
    return buildProfileResults(profile, ratioConfigs, periodBounds.monthsInPeriod);
  }, [mode, otherAdvisorAgg, profile, ratioConfigs, periodBounds]);

  const otherUser = mode === "advisor" ? otherUsers.find((u) => u.id === otherAdvisorId) ?? null : null;

  const meName = `${conseiller.firstName} ${conseiller.lastName}`.trim();
  const otherDisplayName =
    mode === "advisor"
      ? otherUser
        ? `${otherUser.firstName} ${otherUser.lastName}`.trim()
        : "Autre"
      : CATEGORY_LABELS[profile];

  const hasData =
    conseillerAgg !== null && (mode !== "advisor" || otherAdvisorAgg !== null);

  return (
    <SharedLayout
      meName={meName}
      meAvatar={conseiller.avatarUrl}
      otherName={otherDisplayName}
      otherAvatar={otherUser?.avatarUrl}
      meResults={conseillerAgg}
      otherResults={effectiveOther}
      hasData={hasData}
      period={period}
      setPeriod={setPeriod}
      periodBoundsLabel={formatPeriodRange(periodBounds)}
      headerH2={`Mesurez ${conseiller.firstName} à un conseiller ou à un profil cible`}
      headerIntro="Choisissez l'adversaire et la période pour faire apparaître l'écart en CA, en volume et en efficacité métier."
      controlBar={
        <>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode("advisor")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "advisor"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Avec un conseiller
            </button>
            <button
              type="button"
              onClick={() => setMode("profile")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "profile"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Avec un profil
            </button>
          </div>
          {mode === "advisor" &&
            (otherUsers.length === 0 ? (
              <span className="text-xs italic text-muted-foreground">
                Aucun autre conseiller disponible
              </span>
            ) : (
              <select
                value={otherAdvisorId}
                onChange={(e) => setOtherAdvisorId(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                {otherUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
            ))}
          {mode === "profile" && (
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value as UserCategory)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              {(["debutant", "confirme", "expert"] as UserCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          )}
        </>
      }
    />
  );
}

// ─── SHARED LAYOUT (3 sous-cards Verdict/Intensité/Efficacité) ──────────────

function SharedLayout({
  meName,
  meAvatar,
  otherName,
  otherAvatar,
  meResults,
  otherResults,
  hasData,
  period,
  setPeriod,
  periodBoundsLabel,
  headerH2,
  headerIntro,
  controlBar,
}: {
  meName: string;
  meAvatar: string | undefined;
  otherName: string;
  otherAvatar: string | undefined;
  meResults: PeriodResults | null;
  otherResults: PeriodResults | null;
  hasData: boolean;
  period: ComparisonPeriod;
  setPeriod: (p: ComparisonPeriod) => void;
  periodBoundsLabel: string;
  headerH2: string;
  headerIntro: string;
  controlBar: React.ReactNode;
}) {
  const myVerdict = extractVerdict(meResults);
  const otherVerdict = extractVerdict(otherResults);
  const caDelta = myVerdict.ca - otherVerdict.ca;
  const caDeltaPct =
    otherVerdict.ca > 0 ? Math.round((caDelta / otherVerdict.ca) * 100) : 0;

  const volumeAxes = useMemo(
    () => buildVolumeAxes(meResults, otherResults),
    [meResults, otherResults],
  );
  const efficiencyAxes = useMemo(
    () => buildEfficiencyAxes(meResults, otherResults),
    [meResults, otherResults],
  );
  const normalizedVolumes = useMemo(() => normalizeAxes(volumeAxes), [volumeAxes]);
  const normalizedEfficiency = useMemo(() => normalizeAxes(efficiencyAxes), [efficiencyAxes]);

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <Trophy className="h-3.5 w-3.5" />
        Interne
      </div>
      <h2 className="mb-3 text-3xl font-bold text-foreground">{headerH2}</h2>
      <p className="mb-8 max-w-2xl text-muted-foreground">{headerIntro}</p>

      <div className="mb-4 flex flex-wrap items-center gap-4">{controlBar}</div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Période :</span>
        <PeriodSelector options={COMPARISON_PERIOD_OPTIONS} value={period} onChange={setPeriod} />
        <span className="text-xs text-muted-foreground">({periodBoundsLabel})</span>
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Aucune donnée disponible pour cette période.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Essayez d&apos;élargir la période (Trimestre, Semestre, Année).
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sous-card 1 — VERDICT */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Le résultat</h3>
                <p className="text-sm text-muted-foreground">Qui a produit le plus sur la période</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <VerdictCard
                name={meName}
                avatar={meAvatar}
                color="#3375FF"
                bgClass="bg-[#3375FF]/5 border-[#3375FF]/20"
                ca={myVerdict.ca}
                actes={myVerdict.actes}
                mandats={myVerdict.mandats}
              />
              <VerdictCard
                name={otherName}
                avatar={otherAvatar}
                color="#FF8A3D"
                bgClass="bg-[#FF8A3D]/5 border-[#FF8A3D]/20"
                ca={otherVerdict.ca}
                actes={otherVerdict.actes}
                mandats={otherVerdict.mandats}
              />
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="text-sm text-muted-foreground">Écart final :</span>
                <span
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    caDelta > 0
                      ? "text-emerald-500"
                      : caDelta < 0
                        ? "text-red-500"
                        : "text-muted-foreground",
                  )}
                >
                  {caDelta > 0 ? "+" : ""}
                  {formatCurrency(caDelta)} ({caDeltaPct > 0 ? "+" : ""}
                  {caDeltaPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* Sous-card 2 — INTENSITÉ */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Intensité commerciale</h3>
                <p className="text-sm text-muted-foreground">
                  Volumes absolus sur la période — plus le polygone est grand, plus l&apos;activité
                  est intense
                </p>
              </div>
            </div>
            <Legend meName={meName} meAvatar={meAvatar} otherName={otherName} otherAvatar={otherAvatar} />
            <div className="mb-6 flex justify-center">
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
                rawAxes={normalizedVolumes.map((a) => ({ me: a.meRaw, other: a.otherRaw }))}
                primaryLabel={meName}
                overlayLabel={otherName}
                primaryColor="#3375FF"
                overlayColor="#FF8A3D"
                size={420}
                maxValue={100}
              />
            </div>
            <DeltaTable rows={volumeAxes} meName={meName} otherName={otherName} unit="absolute" />
          </div>

          {/* Sous-card 3 — EFFICACITÉ */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Gauge className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Efficacité métier</h3>
                <p className="text-sm text-muted-foreground">
                  Taux de transformation à chaque étape — plus le polygone est grand, mieux on
                  convertit
                </p>
              </div>
            </div>
            <Legend meName={meName} meAvatar={meAvatar} otherName={otherName} otherAvatar={otherAvatar} />
            <div className="mb-6 flex justify-center">
              <ComparisonRadar
                axes={normalizedEfficiency.map((a) => ({
                  id: a.id,
                  label: a.label,
                  score: a.meNormalized,
                }))}
                overlayAxes={normalizedEfficiency.map((a) => ({
                  id: a.id,
                  label: a.label,
                  score: a.otherNormalized,
                }))}
                rawAxes={normalizedEfficiency.map((a) => ({
                  me: a.meRaw,
                  other: a.otherRaw,
                  unit: "%",
                }))}
                primaryLabel={meName}
                overlayLabel={otherName}
                primaryColor="#3375FF"
                overlayColor="#FF8A3D"
                size={420}
                maxValue={100}
              />
            </div>
            <DeltaTable rows={efficiencyAxes} meName={meName} otherName={otherName} unit="percent" />
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Helpers UI internes ─────────────────────────────────────────────────────

function VerdictCard({
  name,
  avatar,
  color,
  bgClass,
  ca,
  actes,
  mandats,
}: {
  name: string;
  avatar?: string;
  color: string;
  bgClass: string;
  ca: number;
  actes: number;
  mandats: number;
}) {
  return (
    <div className={cn("rounded-xl border p-5", bgClass)}>
      <div className="mb-4 flex items-center gap-2">
        <UserAvatar src={avatar} name={name} size="sm" />
        <span className="text-sm font-semibold text-foreground">{name}</span>
      </div>
      <div className="text-3xl font-bold tabular-nums" style={{ color }}>
        {formatCurrency(ca)}
      </div>
      <div className="mb-3 text-xs text-muted-foreground">de CA généré</div>
      <div className="flex gap-4 text-sm">
        <div>
          <div className="font-semibold text-foreground tabular-nums">{actes}</div>
          <div className="text-xs text-muted-foreground">actes</div>
        </div>
        <div>
          <div className="font-semibold text-foreground tabular-nums">{mandats}</div>
          <div className="text-xs text-muted-foreground">mandats</div>
        </div>
      </div>
    </div>
  );
}

function Legend({
  meName,
  meAvatar,
  otherName,
  otherAvatar,
}: {
  meName: string;
  meAvatar?: string;
  otherName: string;
  otherAvatar?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
      <div className="flex items-center gap-2">
        <UserAvatar src={meAvatar} name={meName} size="sm" />
        <span className="text-sm font-semibold text-foreground">{meName}</span>
        <span className="inline-block h-2 w-2 rounded-full bg-[#3375FF]" />
      </div>
      <div className="flex items-center gap-2">
        <UserAvatar src={otherAvatar} name={otherName} size="sm" />
        <span className="text-sm font-semibold text-foreground">{otherName}</span>
        <span className="inline-block h-2 w-2 rounded-full bg-[#FF8A3D]" />
      </div>
    </div>
  );
}

function DeltaTable({
  rows,
  meName,
  otherName,
  unit,
}: {
  rows: Axis[];
  meName: string;
  otherName: string;
  unit: "absolute" | "percent";
}) {
  const fmt = (v: number) =>
    unit === "percent" ? `${Math.round(v)}%` : `${Math.round(v)}`;
  const deltaSuffix = unit === "percent" ? " pts" : "";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 text-left font-medium text-muted-foreground">Indicateur</th>
            <th className="py-2 text-right font-medium text-muted-foreground">{meName}</th>
            <th className="py-2 text-right font-medium text-muted-foreground">{otherName}</th>
            <th className="py-2 text-right font-medium text-muted-foreground">Écart</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const delta = Math.round(row.me - row.other);
            return (
              <tr key={row.id} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 text-foreground">{row.label}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums text-[#3375FF]">
                  {fmt(row.me)}
                </td>
                <td className="py-2.5 text-right font-semibold tabular-nums text-[#FF8A3D]">
                  {fmt(row.other)}
                </td>
                <td
                  className={cn(
                    "py-2.5 text-right font-semibold tabular-nums",
                    delta > 0
                      ? "text-emerald-500"
                      : delta < 0
                        ? "text-red-500"
                        : "text-muted-foreground",
                  )}
                >
                  {delta > 0 ? "+" : ""}
                  {delta}
                  {deltaSuffix}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── scaleResults : multiplie les volumes d'un PeriodResults par k (pour profil × team size) ──

function scaleResults(r: PeriodResults, k: number): PeriodResults {
  if (k === 1) return r;
  return {
    ...r,
    prospection: {
      contactsTotaux: r.prospection.contactsTotaux * k,
      rdvEstimation: r.prospection.rdvEstimation * k,
    },
    vendeurs: {
      ...r.vendeurs,
      rdvEstimation: r.vendeurs.rdvEstimation * k,
      estimationsRealisees: r.vendeurs.estimationsRealisees * k,
      mandatsSignes: r.vendeurs.mandatsSignes * k,
      mandats: Array.from({ length: r.vendeurs.mandats.length * k }, (_, i) => ({
        id: `scaled-${i}`,
        type: r.vendeurs.mandats[i % r.vendeurs.mandats.length]?.type ?? "simple",
      })),
    },
    acheteurs: {
      ...r.acheteurs,
      acheteursSortisVisite: r.acheteurs.acheteursSortisVisite * k,
      nombreVisites: r.acheteurs.nombreVisites * k,
      offresRecues: r.acheteurs.offresRecues * k,
      compromisSignes: r.acheteurs.compromisSignes * k,
      chiffreAffairesCompromis: r.acheteurs.chiffreAffairesCompromis * k,
    },
    ventes: {
      actesSignes: r.ventes.actesSignes * k,
      chiffreAffaires: r.ventes.chiffreAffaires * k,
    },
  };
}
