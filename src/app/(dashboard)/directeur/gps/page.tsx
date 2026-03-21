"use client";

import { useState, useMemo } from "react";
import { useDirectorData } from "@/hooks/use-director-data";
import { useAgencyGPS } from "@/hooks/use-agency-gps";
import { useAppStore } from "@/stores/app-store";
import { calculateObjectiveBreakdown } from "@/lib/objectifs";
import { computeAllRatios } from "@/lib/ratios";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { CATEGORY_OBJECTIVES, NXT_COLORS } from "@/lib/constants";
import { ProgressBar } from "@/components/charts/progress-bar";
import { cn } from "@/lib/utils";
import { MARKET_BENCHMARKS, formatBenchmark } from "@/data/mock-benchmark";
import type { User, UserCategory } from "@/types/user";
import type { RatioId, ComputedRatio } from "@/types/ratios";
import type { PeriodResults } from "@/types/results";
import {
  Target,
  ArrowDown,
  ClipboardCheck,
  FileSignature,
  Eye,
  FileText,
  Handshake,
  FileCheck,
  Save,
  CheckCircle,
  Navigation,
  UserCog,
  ArrowRight,
  Users,
  TrendingDown,
  BarChart3,
} from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";

/* ────── Types ────── */
type GPSTab = "gps" | "niveau" | "alignement";
type NiveauChoice = UserCategory | "actuel";

type NiveauOption = {
  value: NiveauChoice;
  label: string;
  description: string;
  emoji: string;
};

const niveauOptions: NiveauOption[] = [
  {
    value: "debutant",
    label: "Junior",
    description: "Ratios adaptés pour une agence en démarrage ou majoritairement junior",
    emoji: "🌱",
  },
  {
    value: "confirme",
    label: "Confirmé",
    description: "Ratios standards du marché pour une agence expérimentée",
    emoji: "💼",
  },
  {
    value: "expert",
    label: "Expert",
    description: "Ratios exigeants pour une agence de top performers",
    emoji: "🏆",
  },
  {
    value: "actuel",
    label: "Niveau actuel de l'agence",
    description: "Objectifs basés sur les taux de transformation réels agrégés de l'agence",
    emoji: "📊",
  },
];

const ratioLabels: Record<RatioId, string> = {
  contacts_rdv: "Contacts → RDV Estimation",
  estimations_mandats: "Estimations → Mandats",
  pct_mandats_exclusifs: "% Mandats Exclusifs",
  visites_offre: "Visites → Offre",
  offres_compromis: "Offres → Compromis",
  mandats_simples_vente: "Mandats simples / Vente",
  mandats_exclusifs_vente: "Mandats exclusifs / Vente",
};

const ratioIds: RatioId[] = [
  "contacts_rdv",
  "estimations_mandats",
  "pct_mandats_exclusifs",
  "visites_offre",
  "offres_compromis",
  "mandats_simples_vente",
  "mandats_exclusifs_vente",
];

const funnelSteps = [
  { key: "estimationsNecessaires", label: "Estimations", icon: ClipboardCheck },
  { key: "mandatsNecessaires", label: "Mandats", icon: FileSignature },
  { key: "visitesNecessaires", label: "Visites", icon: Eye },
  { key: "offresNecessaires", label: "Offres", icon: FileText },
  { key: "compromisNecessaires", label: "Compromis", icon: Handshake },
  { key: "actesNecessaires", label: "Actes", icon: FileCheck },
] as const;

const tabs: { id: GPSTab; label: string; icon: typeof Target }[] = [
  { id: "gps", label: "GPS Directeur", icon: Navigation },
  { id: "niveau", label: "Niveau d'agence", icon: UserCog },
  { id: "alignement", label: "Alignement objectifs", icon: BarChart3 },
];

function aggregateAllResults(results: PeriodResults[]): PeriodResults | null {
  if (results.length === 0) return null;
  return {
    id: "agency-aggregate",
    userId: "agency",
    periodType: "month",
    periodStart: results[0].periodStart,
    periodEnd: results[0].periodEnd,
    prospection: {
      contactsEntrants: results.reduce((s, r) => s + r.prospection.contactsEntrants, 0),
      contactsTotaux: results.reduce((s, r) => s + r.prospection.contactsTotaux, 0),
      rdvEstimation: results.reduce((s, r) => s + r.prospection.rdvEstimation, 0),
      informationsVente: results.flatMap((r) => r.prospection.informationsVente),
    },
    vendeurs: {
      rdvEstimation: results.reduce((s, r) => s + r.vendeurs.rdvEstimation, 0),
      estimationsRealisees: results.reduce((s, r) => s + r.vendeurs.estimationsRealisees, 0),
      mandatsSignes: results.reduce((s, r) => s + r.vendeurs.mandatsSignes, 0),
      mandats: results.flatMap((r) => r.vendeurs.mandats),
      rdvSuivi: results.reduce((s, r) => s + r.vendeurs.rdvSuivi, 0),
      requalificationSimpleExclusif: results.reduce((s, r) => s + r.vendeurs.requalificationSimpleExclusif, 0),
      baissePrix: results.reduce((s, r) => s + r.vendeurs.baissePrix, 0),
    },
    acheteurs: {
      acheteursChauds: results.flatMap((r) => r.acheteurs.acheteursChauds),
      acheteursSortisVisite: results.reduce((s, r) => s + r.acheteurs.acheteursSortisVisite, 0),
      nombreVisites: results.reduce((s, r) => s + r.acheteurs.nombreVisites, 0),
      offresRecues: results.reduce((s, r) => s + r.acheteurs.offresRecues, 0),
      compromisSignes: results.reduce((s, r) => s + r.acheteurs.compromisSignes, 0),
    },
    ventes: {
      actesSignes: results.reduce((s, r) => s + r.ventes.actesSignes, 0),
      chiffreAffaires: results.reduce((s, r) => s + r.ventes.chiffreAffaires, 0),
      delaiMoyenVente: results.length > 0
        ? Math.round(results.reduce((s, r) => s + r.ventes.delaiMoyenVente, 0) / results.length)
        : 0,
    },
    createdAt: results[0].createdAt,
    updatedAt: results[0].updatedAt,
  };
}

function getDominantCategory(users: User[]): UserCategory {
  const counts: Record<UserCategory, number> = { debutant: 0, confirme: 0, expert: 0 };
  users.forEach((u) => counts[u.category]++);
  if (counts.expert >= counts.confirme && counts.expert >= counts.debutant) return "expert";
  if (counts.confirme >= counts.debutant) return "confirme";
  return "debutant";
}

export default function DirecteurGPSPage() {
  const { teams, allConseillers, allManagers, allResults, ratioConfigs } = useDirectorData();
  const { agencyObjective } = useAgencyGPS();
  const currentUser = useAppStore((s) => s.user);
  const setAgencyObjective = useAppStore((s) => s.setAgencyObjective);

  // All producers
  const allProducers = useMemo(() => {
    const producers: User[] = [...allConseillers];
    for (const m of allManagers) {
      if (!producers.some((p) => p.id === m.id)) producers.push(m);
    }
    if (currentUser && !producers.some((p) => p.id === currentUser.id)) {
      if (allResults.some((r) => r.userId === currentUser.id)) producers.push(currentUser);
    }
    return producers;
  }, [currentUser, allConseillers, allManagers, allResults]);

  const producerCount = allProducers.length;

  // Agency-level aggregated ratios
  const agencyRatios = useMemo((): ComputedRatio[] => {
    const producerIds = new Set(allProducers.map((p) => p.id));
    const producerResults = allResults.filter((r) => producerIds.has(r.userId));
    const agg = aggregateAllResults(producerResults);
    if (!agg) return [];
    return computeAllRatios(agg, "confirme", ratioConfigs);
  }, [allProducers, allResults, ratioConfigs]);

  // Agency CA
  const agencyCA = useMemo(() => {
    const producerIds = new Set(allProducers.map((p) => p.id));
    return allResults
      .filter((r) => producerIds.has(r.userId))
      .reduce((s, r) => s + r.ventes.chiffreAffaires, 0);
  }, [allProducers, allResults]);

  const dominantCategory = useMemo(() => getDominantCategory(allProducers), [allProducers]);

  /* ── Tab state ── */
  const [activeTab, setActiveTab] = useState<GPSTab>("gps");

  /* ── GPS state ── */
  const [annualCA, setAnnualCA] = useState(agencyObjective?.annualCA ?? 500000);
  const [avgActValue, setAvgActValue] = useState(agencyObjective?.avgActValue ?? 10000);
  const [gpsSaved, setGpsSaved] = useState(false);
  const [savedGps, setSavedGps] = useState<{ ca: number; avg: number } | null>(
    agencyObjective ? { ca: agencyObjective.annualCA, avg: agencyObjective.avgActValue } : null
  );

  /* ── Niveau state ── */
  const [selectedNiveau, setSelectedNiveau] = useState<NiveauChoice>(dominantCategory);
  const [niveauSaved, setNiveauSaved] = useState(false);

  /* ── Build custom ratioConfigs when "actuel" is selected ── */
  const effectiveRatioConfigs = useMemo(() => {
    if (selectedNiveau !== "actuel") return ratioConfigs;
    const custom = JSON.parse(JSON.stringify(ratioConfigs)) as typeof ratioConfigs;
    agencyRatios.forEach((ratio) => {
      const id = ratio.ratioId as RatioId;
      if (custom[id]) {
        custom[id].thresholds = {
          debutant: ratio.value,
          confirme: ratio.value,
          expert: ratio.value,
        };
      }
    });
    return custom;
  }, [selectedNiveau, ratioConfigs, agencyRatios]);

  const effectiveCategory: UserCategory = selectedNiveau === "actuel" ? "confirme" : selectedNiveau;

  /* ── GPS calculation ── */
  const effectiveCA = savedGps ? savedGps.ca : annualCA;
  const effectiveAvg = savedGps ? savedGps.avg : avgActValue;

  const breakdown = useMemo(() => {
    if (effectiveCA <= 0 || effectiveAvg <= 0) return null;
    return calculateObjectiveBreakdown(
      effectiveCA,
      effectiveAvg,
      effectiveCategory,
      effectiveRatioConfigs
    );
  }, [effectiveCA, effectiveAvg, effectiveCategory, effectiveRatioConfigs]);

  const monthProgress = new Date().getMonth() + 1;
  const yearProgress = (monthProgress / 12) * 100;

  /* ── Handlers ── */
  const handleSaveGps = () => {
    setSavedGps({ ca: annualCA, avg: avgActValue });
    setAgencyObjective({ annualCA, avgActValue });
    setGpsSaved(true);
    setTimeout(() => setGpsSaved(false), 2500);
  };

  const handleSaveNiveau = () => {
    setNiveauSaved(true);
    setTimeout(() => setNiveauSaved(false), 2500);
  };

  /* ── Ratio thresholds for selected level ── */
  const thresholdsForLevel = useMemo(() => {
    const result: Record<string, number> = {};
    ratioIds.forEach((id) => {
      result[id] = effectiveRatioConfigs[id].thresholds[effectiveCategory];
    });
    return result;
  }, [effectiveCategory, effectiveRatioConfigs]);

  /* ── Alignment data (Tab 3) ── */
  const alignmentThemes = useMemo(() => {
    if (!breakdown) return [];

    const breakdownMonthly = {
      estimations: Math.ceil(breakdown.estimationsNecessaires / 12),
      mandats: Math.ceil(breakdown.mandatsNecessaires / 12),
      offres: Math.ceil(breakdown.offresNecessaires / 12),
      ca: Math.round(effectiveCA / 12),
    };

    const defs = [
      { key: "estimations", label: "Estimations", objKey: "estimations" as const, isCA: false },
      { key: "mandats", label: "Mandats", objKey: "mandats" as const, isCA: false },
      { key: "offres", label: "Offres", objKey: "offres" as const, isCA: false },
      { key: "ca", label: "CA", objKey: "ca" as const, isCA: true },
    ];

    return defs.map((t) => {
      const agentsObj = allConseillers.reduce(
        (sum, c) => sum + (CATEGORY_OBJECTIVES[c.category]?.[t.objKey] ?? 0), 0
      );
      const managersObj = allManagers.reduce(
        (sum, m) => sum + (CATEGORY_OBJECTIVES[m.category]?.[t.objKey] ?? 0), 0
      );
      const directeurObj = breakdownMonthly[t.objKey];

      const values = [agentsObj, managersObj, directeurObj];
      const maxVal = Math.max(...values);
      const minVal = Math.min(...values);
      const gap = maxVal - minVal;
      const ratio = minVal > 0 ? maxVal / minVal : 1;

      let status: "aligned" | "warning" | "danger";
      if (ratio <= 1.1) status = "aligned";
      else if (ratio <= 1.2) status = "warning";
      else status = "danger";

      return { ...t, agentsObj, managersObj, directeurObj, gap, status };
    });
  }, [allConseillers, allManagers, breakdown, effectiveCA]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">GPS Directeur</h1>
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {producerCount} producteur{producerCount > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════ TAB 1 : GPS Directeur ═══════════ */}
      {activeTab === "gps" && (
        <div className="space-y-6">
          {/* Saisie GPS */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                <Navigation className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  GPS financier de l&apos;agence
                </h2>
                <p className="text-sm text-muted-foreground">
                  Définissez l&apos;objectif annuel de l&apos;agence pour calculer les actions nécessaires
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Objectif CA annuel de l&apos;agence (€)
                </label>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={annualCA}
                  onChange={(e) => setAnnualCA(Number(e.target.value))}
                  className="h-12 w-full rounded-lg border border-input bg-background px-4 text-lg font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Valeur moyenne par acte (€)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={avgActValue}
                  onChange={(e) => setAvgActValue(Number(e.target.value))}
                  className="h-12 w-full rounded-lg border border-input bg-background px-4 text-lg font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <button
              onClick={handleSaveGps}
              className={cn(
                "mt-5 flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all",
                gpsSaved
                  ? "bg-green-500/20 text-green-400"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {gpsSaved ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  GPS enregistré !
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Enregistrer le GPS
                </>
              )}
            </button>
          </div>

          {/* Niveau sélectionné affiché */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {niveauOptions.find((n) => n.value === selectedNiveau)?.emoji ?? "📊"}
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">Niveau sélectionné</p>
                  <p className="font-semibold text-foreground">
                    {niveauOptions.find((n) => n.value === selectedNiveau)?.label ?? "Niveau actuel"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("niveau")}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Modifier
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Funnel Breakdown */}
          {breakdown && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Actions à entreprendre pour l&apos;agence
              </h2>

              {/* CA Target */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
                <p className="text-sm text-muted-foreground">
                  Objectif CA Annuel Agence
                </p>
                <p className="mt-1 text-3xl font-bold text-primary">
                  {formatCurrency(effectiveCA)}
                </p>
                <ProgressBar
                  value={
                    effectiveCA > 0
                      ? (agencyCA / effectiveCA) * 100 * 12
                      : 0
                  }
                  label="Progression annuelle projetée"
                  status="ok"
                  className="mt-3"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  CA réalisé ce mois : {formatCurrency(agencyCA)}
                </p>
              </div>

              <div className="flex justify-center">
                <ArrowDown className="h-6 w-6 text-muted-foreground" />
              </div>

              {/* Steps Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {funnelSteps.map((step) => {
                  const value = breakdown[step.key as keyof typeof breakdown];
                  const Icon = step.icon;
                  const monthly = Math.ceil(value / 12);

                  return (
                    <div
                      key={step.key}
                      className="rounded-xl border border-border bg-card p-5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {step.label} nécessaires
                          </p>
                          <p className="text-2xl font-bold text-foreground">
                            {Math.round(value)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Soit ~{monthly}/mois
                        </p>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          ~{Math.ceil(monthly / 4)}/sem.
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Exclusivity */}
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">
                  % d&apos;exclusivité nécessaire
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {breakdown.pourcentageExclusivite}%
                </p>
                <ProgressBar
                  value={breakdown.pourcentageExclusivite}
                  status={breakdown.pourcentageExclusivite >= 50 ? "ok" : "warning"}
                  showValue={false}
                  size="sm"
                  className="mt-2"
                />
              </div>

              {/* Year progress */}
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">
                  Avancement de l&apos;année
                </p>
                <ProgressBar
                  value={yearProgress}
                  label={`Mois ${monthProgress}/12`}
                  status="ok"
                  className="mt-2"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TAB 2 : Niveau d'agence ═══════════ */}
      {activeTab === "niveau" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
                <UserCog className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Niveau de l&apos;agence
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choisissez le niveau de référence pour calculer les objectifs de l&apos;agence
                </p>
              </div>
            </div>

            {/* Composition par équipe */}
            <div className="mb-5 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Composition de l&apos;agence</p>
              {teams.map((team) => (
                <div key={team.teamId} className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{team.teamName} — {team.managerName}</p>
                  <div className="flex flex-wrap gap-2">
                    {team.agents.map((u: User) => (
                      <span
                        key={u.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1 text-xs"
                      >
                        <span className="font-medium text-foreground">{u.firstName} {u.lastName}</span>
                        <span className="text-muted-foreground">
                          ({u.category === "debutant" ? "Junior" : u.category === "confirme" ? "Confirmé" : "Expert"})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {niveauOptions.map((option) => {
                const isSelected = selectedNiveau === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setSelectedNiveau(option.value)}
                    className={cn(
                      "relative rounded-xl border-2 p-5 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                        <CheckCircle className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <span className="text-3xl">{option.emoji}</span>
                    <h3 className="mt-3 text-lg font-bold text-foreground">
                      {option.label}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleSaveNiveau}
              className={cn(
                "mt-5 flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all",
                niveauSaved
                  ? "bg-green-500/20 text-green-400"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {niveauSaved ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Niveau enregistré !
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Enregistrer le niveau
                </>
              )}
            </button>
          </div>

          {/* Ratios utilisés selon le niveau sélectionné */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-base font-semibold text-foreground">
              Ratios de transformation —{" "}
              <span className="text-primary">
                {niveauOptions.find((n) => n.value === selectedNiveau)?.label}
              </span>
            </h3>
            <div className="space-y-3">
              {ratioIds.map((id) => {
                const config = ratioConfigs[id];
                const threshold = thresholdsForLevel[id];
                const benchmark = MARKET_BENCHMARKS[id];
                const belowMarket = benchmark && (benchmark.isLowerBetter
                  ? threshold > benchmark.marketAverage
                  : threshold < benchmark.marketAverage);

                return (
                  <div
                    key={id}
                    className="rounded-lg border border-border bg-muted/30 px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">
                        {ratioLabels[id]}
                      </p>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                        {config.isPercentage ? `${Math.round(threshold)}%` : Number(threshold).toFixed(1)}
                      </span>
                    </div>
                    {benchmark && (
                      <div className="mt-1 flex items-center gap-1">
                        {belowMarket && <TrendingDown className="h-3 w-3 text-red-500" />}
                        <p className={cn("text-xs", belowMarket ? "text-red-500" : "text-muted-foreground")}>
                          {formatBenchmark(id)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB 3 : Alignement objectifs ═══════════ */}
      {activeTab === "alignement" && (
        <div className="space-y-6">
          {!breakdown && (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Navigation className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium text-foreground">
                Définissez votre GPS pour voir l&apos;alignement
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Rendez-vous dans l&apos;onglet GPS Directeur pour définir l&apos;objectif CA annuel de l&apos;agence
              </p>
              <button
                onClick={() => setActiveTab("gps")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Navigation className="h-4 w-4" />
                Configurer le GPS
              </button>
            </div>
          )}
          {alignmentThemes.map((theme) => {
            const fmtFn = theme.isCA ? formatCurrency : formatNumber;
            const gapText = theme.isCA ? formatCurrency(theme.gap) : formatNumber(theme.gap);
            const barColors = [NXT_COLORS.violet, NXT_COLORS.blue, NXT_COLORS.green];
            const chartData = [
              { niveau: "Directeur", value: theme.directeurObj },
              { niveau: "Managers", value: theme.managersObj },
              { niveau: "Agents", value: theme.agentsObj },
            ];
            const yFormatter = theme.isCA
              ? (v: number) => `${(v / 1000).toFixed(0)}k €`
              : (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v));

            return (
              <div key={theme.key} className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Objectifs {theme.label}</h3>
                  <p className="text-xs text-muted-foreground">Objectifs mensuels par niveau</p>
                </div>

                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={chartData} barGap={8}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="color-mix(in oklch, currentColor, transparent 88%)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="niveau"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "color-mix(in oklch, currentColor, transparent 45%)", fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "color-mix(in oklch, currentColor, transparent 45%)", fontSize: 12 }}
                        tickFormatter={yFormatter}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card, #0F1F46)",
                          border: "1px solid var(--border, #1a2d5a)",
                          borderRadius: "8px",
                          color: "var(--foreground, white)",
                          fontSize: "12px",
                        }}
                        formatter={(value) => {
                          if (typeof value === "number") return theme.isCA ? formatCurrency(value) : formatNumber(value);
                          return value;
                        }}
                      />
                      <Bar dataKey="value" barSize={40} radius={[6, 6, 0, 0]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={barColors[i]} />
                        ))}
                      </Bar>
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>

                {/* Custom legend */}
                <div className="flex items-center justify-center gap-6 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: NXT_COLORS.violet }} />
                    <span className="text-muted-foreground">Directeur : {fmtFn(theme.directeurObj)}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: NXT_COLORS.blue }} />
                    <span className="text-muted-foreground">Managers : {fmtFn(theme.managersObj)}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: NXT_COLORS.green }} />
                    <span className="text-muted-foreground">Agents : {fmtFn(theme.agentsObj)}</span>
                  </span>
                </div>

                {/* Gap analysis */}
                <div className="flex justify-end">
                  <span className={cn(
                    "text-xs font-medium",
                    theme.status === "aligned" ? "text-green-500" :
                    theme.status === "warning" ? "text-orange-500" : "text-red-500"
                  )}>
                    {theme.status === "aligned" ? "Aligné" :
                     `Écart${theme.status === "danger" ? " important" : ""} de ${gapText}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
