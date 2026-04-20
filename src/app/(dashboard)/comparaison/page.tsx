"use client";

import { useState, useMemo } from "react";
import { LockedFeature } from "@/components/subscription/locked-feature";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useAllResults } from "@/hooks/use-results";
import { useAppStore } from "@/stores/app-store";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ComparisonRadar } from "@/components/charts/comparison-radar";
import { PeriodSelector } from "@/components/ui/period-selector";
import { DPIComparisonView } from "@/components/dpi/dpi-comparison-view";
import { CATEGORY_LABELS, CATEGORY_OBJECTIVES } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
import { aggregateResults } from "@/lib/aggregate-results";
import {
  getPeriodBounds,
  formatPeriodRange,
  COMPARISON_PERIOD_OPTIONS,
  type ComparisonPeriod,
} from "@/lib/date-periods";
import type { User, UserCategory } from "@/types/user";
import type { RatioConfig, RatioId } from "@/types/ratios";
import type { PeriodResults } from "@/types/results";

type CompareMode = "advisor" | "profile";
type TabType = "interne" | "classement" | "dpi";

export default function ComparaisonPage() {
  const [tab, setTab] = useState<TabType>("interne");
  const [mode, setMode] = useState<CompareMode>("advisor");
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>("u-demo-2");
  const [selectedProfile, setSelectedProfile] =
    useState<UserCategory>("expert");

  const { user } = useUser();
  const allResults = useAllResults();
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const users = useAppStore((s) => s.users);

  const [period, setPeriod] = useState<ComparisonPeriod>("mois");
  const periodBounds = useMemo(() => getPeriodBounds(period), [period]);

  const myAggregatedResults = useMemo(() => {
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

  const otherAggregatedResults = useMemo(() => {
    if (mode !== "advisor") return null;
    const startMs = periodBounds.start.getTime();
    const endMs = periodBounds.end.getTime();
    const inPeriod = allResults.filter((r) => {
      if (r.userId !== selectedAdvisorId) return false;
      const ts = new Date(r.periodStart).getTime();
      return ts >= startMs && ts <= endMs;
    });
    return aggregateResults(inPeriod);
  }, [mode, allResults, selectedAdvisorId, periodBounds]);

  const effectiveOther = useMemo<PeriodResults | null>(() => {
    if (mode === "advisor") return otherAggregatedResults;
    return buildProfileResults(selectedProfile, ratioConfigs, periodBounds.monthsInPeriod);
  }, [mode, otherAggregatedResults, selectedProfile, ratioConfigs, periodBounds]);

  const myVerdict = extractVerdict(myAggregatedResults);
  const otherVerdict = extractVerdict(effectiveOther);
  const caDelta = myVerdict.ca - otherVerdict.ca;
  const caDeltaPct =
    otherVerdict.ca > 0 ? Math.round((caDelta / otherVerdict.ca) * 100) : 0;

  const volumeAxes = useMemo(
    () => buildVolumeAxes(myAggregatedResults, effectiveOther),
    [myAggregatedResults, effectiveOther]
  );
  const efficiencyAxes = useMemo(
    () => buildEfficiencyAxes(myAggregatedResults, effectiveOther),
    [myAggregatedResults, effectiveOther]
  );

  const hasData =
    myAggregatedResults !== null &&
    (mode !== "advisor" || otherAggregatedResults !== null);

  const normalizedVolumes = useMemo(
    () => normalizeAxes(volumeAxes),
    [volumeAxes]
  );
  const normalizedEfficiency = useMemo(
    () => normalizeAxes(efficiencyAxes),
    [efficiencyAxes]
  );

  const otherUsers = users.filter(
    (u) => u.id !== user?.id && u.role === "conseiller"
  );

  const selectedOtherUser: User | null =
    mode === "advisor"
      ? otherUsers.find((u) => u.id === selectedAdvisorId) ?? null
      : null;

  const otherDisplayName =
    mode === "advisor"
      ? selectedOtherUser
        ? `${selectedOtherUser.firstName} ${selectedOtherUser.lastName}`.trim()
        : "Autre"
      : CATEGORY_LABELS[selectedProfile];

  const meDisplayName = user
    ? `${user.firstName} ${user.lastName}`.trim() || "Moi"
    : "Moi";

  return (
    <LockedFeature feature="comparaison" featureName="Comparaison N-1" featureDescription="Comparez vos résultats avec l'année précédente">
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Comparaison</h1>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <p className="text-sm italic text-muted-foreground">
          La comparaison telle qu&apos;un coach la ferait : pas juste des
          chiffres, mais un verdict en euros et en efficacité métier.
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setTab("interne")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "interne"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Comparaison Interne
        </button>
        <button
          onClick={() => setTab("classement")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "classement"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Classement NXT
        </button>
        <button
          onClick={() => setTab("dpi")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            tab === "dpi"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Comparaison DPI
        </button>
      </div>

      {/* ========== CLASSEMENT NXT ========== */}
      {tab === "classement" && (
        <LeaderboardSection
          currentUserId={user?.id ?? ""}
          currentUserFirstName={user?.firstName ?? ""}
          currentUserAvatarUrl={user?.avatarUrl}
        />
      )}

      {/* ========== INTERNE ========== */}
      {tab === "interne" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => setMode("advisor")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  mode === "advisor"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                Avec un conseiller
              </button>
              <button
                onClick={() => setMode("profile")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  mode === "profile"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                Avec un profil
              </button>
            </div>

            {mode === "advisor" && (
              <select
                value={selectedAdvisorId}
                onChange={(e) => setSelectedAdvisorId(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                {otherUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
            )}

            {mode === "profile" && (
              <select
                value={selectedProfile}
                onChange={(e) =>
                  setSelectedProfile(e.target.value as UserCategory)
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                {(["debutant", "confirme", "expert"] as UserCategory[]).map(
                  (cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  )
                )}
              </select>
            )}
          </div>

          {/* Période */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Période :</span>
            <PeriodSelector
              options={COMPARISON_PERIOD_OPTIONS}
              value={period}
              onChange={setPeriod}
            />
            <span className="text-xs text-muted-foreground">
              ({formatPeriodRange(periodBounds)})
            </span>
          </div>

          {!hasData ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <div className="text-sm text-muted-foreground">
                Aucune donnée disponible pour cette période.
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Essaye d&apos;élargir la période (Trimestre, Semestre, Année).
              </div>
            </div>
          ) : (
          <>
          {/* ═══ BLOC 1 — VERDICT ═══ */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-foreground">Le résultat</h3>
              <p className="text-sm text-muted-foreground">
                Qui a produit le plus sur la période
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <VerdictCard
                name={meDisplayName}
                avatar={user?.avatarUrl}
                color="#3375FF"
                bgClass="bg-[#3375FF]/5 border-[#3375FF]/20"
                ca={myVerdict.ca}
                actes={myVerdict.actes}
                mandats={myVerdict.mandats}
              />
              <VerdictCard
                name={otherDisplayName}
                avatar={selectedOtherUser?.avatarUrl}
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
                    "text-lg font-bold",
                    caDelta > 0
                      ? "text-emerald-500"
                      : caDelta < 0
                      ? "text-red-500"
                      : "text-muted-foreground"
                  )}
                >
                  {caDelta > 0 ? "+" : ""}
                  {formatCurrency(caDelta)}
                  {" "}({caDeltaPct > 0 ? "+" : ""}
                  {caDeltaPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* ═══ BLOC 2 — INTENSITÉ COMMERCIALE ═══ */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-foreground">Intensité commerciale</h3>
              <p className="text-sm text-muted-foreground">
                Volumes absolus sur la période — plus le polygone est grand, plus
                l&apos;activité est intense
              </p>
            </div>

            <Legend
              meName={meDisplayName}
              meAvatar={user?.avatarUrl}
              otherName={otherDisplayName}
              otherAvatar={selectedOtherUser?.avatarUrl}
            />

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
                rawAxes={normalizedVolumes.map((a) => ({
                  me: a.meRaw,
                  other: a.otherRaw,
                }))}
                primaryLabel={meDisplayName}
                overlayLabel={otherDisplayName}
                primaryColor="#3375FF"
                overlayColor="#FF8A3D"
                size={420}
                maxValue={100}
              />
            </div>

            <DeltaTable
              rows={volumeAxes}
              meName={meDisplayName}
              otherName={otherDisplayName}
              unit="absolute"
            />
          </div>

          {/* ═══ BLOC 3 — EFFICACITÉ MÉTIER ═══ */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-foreground">Efficacité métier</h3>
              <p className="text-sm text-muted-foreground">
                Taux de transformation à chaque étape — plus le polygone est grand,
                mieux tu convertis
              </p>
            </div>

            <Legend
              meName={meDisplayName}
              meAvatar={user?.avatarUrl}
              otherName={otherDisplayName}
              otherAvatar={selectedOtherUser?.avatarUrl}
            />

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
                primaryLabel={meDisplayName}
                overlayLabel={otherDisplayName}
                primaryColor="#3375FF"
                overlayColor="#FF8A3D"
                size={420}
                maxValue={100}
              />
            </div>

            <DeltaTable
              rows={efficiencyAxes}
              meName={meDisplayName}
              otherName={otherDisplayName}
              unit="percent"
            />
          </div>
          </>
          )}
        </div>
      )}

      {/* ========== COMPARAISON DPI ========== */}
      {tab === "dpi" && (
        <DPIComparisonView />
      )}
    </div>
    </LockedFeature>
  );
}

// ── Helpers : extraction de données ────────────────────────────────────────

interface VerdictData {
  ca: number;
  actes: number;
  mandats: number;
}

function extractVerdict(r: PeriodResults | null): VerdictData {
  if (!r) return { ca: 0, actes: 0, mandats: 0 };
  return {
    ca: r.ventes.chiffreAffaires,
    actes: r.ventes.actesSignes,
    mandats: r.vendeurs.mandatsSignes,
  };
}

interface Axis {
  id: string;
  label: string;
  me: number;
  other: number;
}

interface NormalizedAxis {
  id: string;
  label: string;
  meNormalized: number; // 0-100
  otherNormalized: number; // 0-100
  meRaw: number;
  otherRaw: number;
}

function normalizeAxes(axes: Axis[]): NormalizedAxis[] {
  return axes.map((axis) => {
    const max = Math.max(axis.me, axis.other, 1);
    return {
      id: axis.id,
      label: axis.label,
      meNormalized: (axis.me / max) * 100,
      otherNormalized: (axis.other / max) * 100,
      meRaw: axis.me,
      otherRaw: axis.other,
    };
  });
}

function buildVolumeAxes(
  me: PeriodResults | null,
  other: PeriodResults | null
): Axis[] {
  const safe = (r: PeriodResults | null) => ({
    contacts: r?.prospection.contactsTotaux ?? 0,
    estimations: r?.vendeurs.estimationsRealisees ?? 0,
    mandats: r?.vendeurs.mandatsSignes ?? 0,
    visites: r?.acheteurs.nombreVisites ?? 0,
    offres: r?.acheteurs.offresRecues ?? 0,
    compromis: r?.acheteurs.compromisSignes ?? 0,
    actes: r?.ventes.actesSignes ?? 0,
  });
  const m = safe(me);
  const o = safe(other);
  return [
    { id: "contacts", label: "Contacts", me: m.contacts, other: o.contacts },
    { id: "estimations", label: "Estimations", me: m.estimations, other: o.estimations },
    { id: "mandats", label: "Mandats", me: m.mandats, other: o.mandats },
    { id: "visites", label: "Visites", me: m.visites, other: o.visites },
    { id: "offres", label: "Offres", me: m.offres, other: o.offres },
    { id: "compromis", label: "Compromis", me: m.compromis, other: o.compromis },
    { id: "actes", label: "Actes", me: m.actes, other: o.actes },
  ];
}

function pctRatio(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 100) : 0;
}

function computeExclusivityRate(r: PeriodResults | null): number {
  if (!r) return 0;
  const total = r.vendeurs.mandats.length;
  if (total === 0) return 0;
  const exclu = r.vendeurs.mandats.filter((m) => m.type === "exclusif").length;
  return Math.round((exclu / total) * 100);
}

function buildEfficiencyAxes(
  me: PeriodResults | null,
  other: PeriodResults | null
): Axis[] {
  return [
    {
      id: "contactsToEstim",
      label: "Contact → Estim",
      me: pctRatio(me?.vendeurs.estimationsRealisees ?? 0, me?.prospection.contactsTotaux ?? 0),
      other: pctRatio(other?.vendeurs.estimationsRealisees ?? 0, other?.prospection.contactsTotaux ?? 0),
    },
    {
      id: "estimToMandat",
      label: "Estim → Mandat",
      me: pctRatio(me?.vendeurs.mandatsSignes ?? 0, me?.vendeurs.estimationsRealisees ?? 0),
      other: pctRatio(other?.vendeurs.mandatsSignes ?? 0, other?.vendeurs.estimationsRealisees ?? 0),
    },
    {
      id: "exclu",
      label: "% Exclusivité",
      me: computeExclusivityRate(me),
      other: computeExclusivityRate(other),
    },
    {
      id: "acheteursToVisite",
      label: "Acheteur → Visite",
      me: pctRatio(me?.acheteurs.nombreVisites ?? 0, me?.acheteurs.acheteursSortisVisite ?? 0),
      other: pctRatio(other?.acheteurs.nombreVisites ?? 0, other?.acheteurs.acheteursSortisVisite ?? 0),
    },
    {
      id: "visiteToOffre",
      label: "Visite → Offre",
      me: pctRatio(me?.acheteurs.offresRecues ?? 0, me?.acheteurs.nombreVisites ?? 0),
      other: pctRatio(other?.acheteurs.offresRecues ?? 0, other?.acheteurs.nombreVisites ?? 0),
    },
    {
      id: "offreToCompromis",
      label: "Offre → Compromis",
      me: pctRatio(me?.acheteurs.compromisSignes ?? 0, me?.acheteurs.offresRecues ?? 0),
      other: pctRatio(other?.acheteurs.compromisSignes ?? 0, other?.acheteurs.offresRecues ?? 0),
    },
    {
      id: "compromisToActe",
      label: "Compromis → Acte",
      me: pctRatio(me?.ventes.actesSignes ?? 0, me?.acheteurs.compromisSignes ?? 0),
      other: pctRatio(other?.ventes.actesSignes ?? 0, other?.acheteurs.compromisSignes ?? 0),
    },
  ];
}

function buildProfileResults(
  profile: UserCategory,
  ratioConfigs: Record<RatioId, RatioConfig>,
  monthsInPeriod: number
): PeriodResults {
  const obj = CATEGORY_OBJECTIVES[profile];
  const mult = Math.max(1, monthsInPeriod);

  const estimations = obj.estimations * mult;
  const mandats = obj.mandats * mult;
  const visites = obj.visites * mult;
  const offres = obj.offres * mult;
  const compromis = obj.compromis * mult;
  const actes = obj.actes * mult;
  const ca = obj.ca * mult;

  const contactsTarget = Math.round(
    estimations * ratioConfigs.contacts_rdv.thresholds[profile]
  );
  // % d'exclusivité reste un pourcentage (non cumulable)
  const numExclu = Math.floor((mandats * obj.exclusivite) / 100);
  const acheteursTarget = Math.max(
    1,
    Math.ceil(visites / ratioConfigs.acheteurs_visites.thresholds[profile])
  );
  const avgAct = actes > 0 ? ca / actes : 0;
  const now = new Date().toISOString();
  return {
    id: "profile-synth",
    userId: "profile-synth",
    periodType: "month",
    periodStart: now,
    periodEnd: now,
    prospection: {
      contactsTotaux: contactsTarget,
      rdvEstimation: estimations,
    },
    vendeurs: {
      rdvEstimation: estimations,
      estimationsRealisees: estimations,
      mandatsSignes: mandats,
      mandats: Array.from({ length: mandats }, (_, i) => ({
        id: `profile-mandat-${i}`,
        type: i < numExclu ? ("exclusif" as const) : ("simple" as const),
      })),
      rdvSuivi: 0,
      requalificationSimpleExclusif: 0,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: acheteursTarget,
      nombreVisites: visites,
      offresRecues: offres,
      compromisSignes: compromis,
      chiffreAffairesCompromis: Math.round(compromis * avgAct),
    },
    ventes: {
      actesSignes: actes,
      chiffreAffaires: ca,
    },
    createdAt: now,
    updatedAt: now,
  };
}

// ── Sous-composants internes ───────────────────────────────────────────────

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
    <div className={cn("rounded-lg border p-5", bgClass)}>
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
  const fmt = (v: number) => (unit === "percent" ? `${Math.round(v)}%` : `${Math.round(v)}`);
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
                <td className="py-2.5 text-right font-semibold text-[#3375FF] tabular-nums">
                  {fmt(row.me)}
                </td>
                <td className="py-2.5 text-right font-semibold text-[#FF8A3D] tabular-nums">
                  {fmt(row.other)}
                </td>
                <td
                  className={cn(
                    "py-2.5 text-right font-semibold tabular-nums",
                    delta > 0
                      ? "text-emerald-500"
                      : delta < 0
                      ? "text-red-500"
                      : "text-muted-foreground"
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

// ── Classement NXT anonyme ──────────────────────────────────────────────────

function LeaderboardSection({
  currentUserId,
  currentUserFirstName,
  currentUserAvatarUrl,
}: {
  currentUserId: string;
  currentUserFirstName: string;
  currentUserAvatarUrl?: string;
}) {
  const isDemo = useAppStore((s) => s.isDemo);
  const allResults = useAllResults();
  const users = useAppStore((s) => s.users);

  // In demo mode: build leaderboard from mock data
  const leaderboard = useMemo(() => {
    const conseillers = users.filter((u) => u.role === "conseiller" || u.role === "manager");
    const entries = conseillers.map((u) => {
      const userResults = allResults.filter((r) => r.userId === u.id);
      const totalCA = userResults.reduce((sum, r) => sum + (r.ventes?.chiffreAffaires ?? 0), 0);
      const totalMandats = userResults.reduce((sum, r) => sum + (r.vendeurs?.mandatsSignes ?? 0), 0);
      const totalActes = userResults.reduce((sum, r) => sum + (r.ventes?.actesSignes ?? 0), 0);
      return { userId: u.id, prenom: u.firstName, ca: totalCA, mandats: totalMandats, actes: totalActes };
    });
    return entries.sort((a, b) => b.ca - a.ca).slice(0, 20);
  }, [users, allResults]);

  const currentUserRank = leaderboard.findIndex((e) => e.userId === currentUserId);
  const currentEntry = leaderboard.find((e) => e.userId === currentUserId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Classement NXT Performance — Top 20</h2>
        <p className="text-xs text-muted-foreground">Comparaison anonyme entre conseillers NXT — Prénoms uniquement</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5">#</th>
              <th className="px-2 py-2.5" />
              <th className="px-4 py-2.5">Prénom</th>
              <th className="px-4 py-2.5 text-right">CA</th>
              <th className="px-4 py-2.5 text-right hidden sm:table-cell">Mandats</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, idx) => {
              const isMe = entry.userId === currentUserId;
              return (
                <tr key={entry.userId} className={cn(
                  "border-b border-border/50 last:border-0",
                  isMe && "bg-primary/10 font-semibold"
                )}>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                      idx === 0 ? "bg-amber-500/20 text-amber-500" :
                      idx === 1 ? "bg-slate-400/20 text-slate-400" :
                      idx === 2 ? "bg-orange-600/20 text-orange-600" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-2.5 pr-2">
                    <UserAvatar
                      src={isMe ? currentUserAvatarUrl : undefined}
                      name={entry.prenom}
                      size="sm"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-foreground">
                    {isMe ? `${entry.prenom} (vous)` : entry.prenom}
                  </td>
                  <td className="px-4 py-2.5 text-right text-foreground">
                    {entry.ca.toLocaleString("fr-FR")} €
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground hidden sm:table-cell">
                    {entry.mandats}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {currentUserRank === -1 && currentUserFirstName && (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Votre position : #{leaderboard.length + 1} — CA : {currentEntry?.ca?.toLocaleString("fr-FR") ?? 0} €
        </div>
      )}
    </div>
  );
}
