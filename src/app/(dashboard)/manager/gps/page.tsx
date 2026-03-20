"use client";

import { useState, useMemo } from "react";
import { useTeamGPS } from "@/hooks/use-team-gps";
import { calculateObjectiveBreakdown } from "@/lib/objectifs";
import { formatCurrency } from "@/lib/formatters";
import { ProgressBar } from "@/components/charts/progress-bar";
import { cn } from "@/lib/utils";
import type { User, UserCategory } from "@/types/user";
import type { RatioId } from "@/types/ratios";
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
} from "lucide-react";
import { MARKET_BENCHMARKS, formatBenchmark } from "@/data/mock-benchmark";

/* ────── Types ────── */
type GPSTab = "gps" | "niveau";
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
    description: "Ratios adaptés pour une équipe en démarrage ou majoritairement junior",
    emoji: "🌱",
  },
  {
    value: "confirme",
    label: "Confirmé",
    description: "Ratios standards du marché pour une équipe expérimentée",
    emoji: "💼",
  },
  {
    value: "expert",
    label: "Expert",
    description: "Ratios exigeants pour une équipe de top performers",
    emoji: "🏆",
  },
  {
    value: "actuel",
    label: "Niveau actuel de l'équipe",
    description: "Objectifs basés sur les taux de transformation réels agrégés de l'équipe",
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
  { id: "gps", label: "GPS Équipe", icon: Navigation },
  { id: "niveau", label: "Niveau Équipe", icon: UserCog },
];

export default function ManagerGPSPage() {
  const {
    teamConseillers,
    teamRatios,
    teamCA,
    ratioConfigs,
    dominantCategory,
    memberCount,
  } = useTeamGPS();

  /* ── Tab state ── */
  const [activeTab, setActiveTab] = useState<GPSTab>("gps");

  /* ── GPS state ── */
  const [annualCA, setAnnualCA] = useState(300000);
  const [avgActValue, setAvgActValue] = useState(10000);
  const [gpsSaved, setGpsSaved] = useState(false);
  const [savedGps, setSavedGps] = useState<{ ca: number; avg: number } | null>(null);

  /* ── Niveau state — defaults to dominant team category ── */
  const [selectedNiveau, setSelectedNiveau] = useState<NiveauChoice>(dominantCategory);
  const [niveauSaved, setNiveauSaved] = useState(false);

  /* ── Build custom ratioConfigs when "actuel" is selected ── */
  const effectiveRatioConfigs = useMemo(() => {
    if (selectedNiveau !== "actuel") return ratioConfigs;
    const custom = JSON.parse(JSON.stringify(ratioConfigs)) as typeof ratioConfigs;
    teamRatios.forEach((ratio) => {
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
  }, [selectedNiveau, ratioConfigs, teamRatios]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">GPS Équipe</h1>
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {memberCount} conseiller{memberCount > 1 ? "s" : ""}
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

      {/* ═══════════ TAB : GPS Équipe ═══════════ */}
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
                  GPS financier de l&apos;équipe
                </h2>
                <p className="text-sm text-muted-foreground">
                  Définissez l&apos;objectif annuel de l&apos;équipe pour calculer les actions nécessaires
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Objectif CA annuel équipe (€)
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
                Actions à entreprendre (équipe)
              </h2>

              {/* CA Target */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
                <p className="text-sm text-muted-foreground">
                  Objectif CA Annuel Équipe
                </p>
                <p className="mt-1 text-3xl font-bold text-primary">
                  {formatCurrency(effectiveCA)}
                </p>
                <ProgressBar
                  value={
                    effectiveCA > 0
                      ? (teamCA / effectiveCA) * 100 * 12
                      : 0
                  }
                  label="Progression annuelle projetée"
                  status="ok"
                  className="mt-3"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  CA réalisé ce mois : {formatCurrency(teamCA)}
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

      {/* ═══════════ TAB : Niveau Équipe ═══════════ */}
      {activeTab === "niveau" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
                <UserCog className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Niveau de l&apos;équipe
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choisissez le niveau de référence pour calculer les objectifs de l&apos;équipe
                </p>
              </div>
            </div>

            {/* Composition de l'équipe */}
            <div className="mb-5 rounded-lg bg-muted/30 p-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Composition de l&apos;équipe</p>
              <div className="flex flex-wrap gap-2">
                {teamConseillers.map((u: User) => (
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
    </div>
  );
}
