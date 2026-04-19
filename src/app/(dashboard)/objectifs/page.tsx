"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LockedFeature } from "@/components/subscription/locked-feature";
import { useUser } from "@/hooks/use-user";
import { useResults } from "@/hooks/use-results";
import { useRatios } from "@/hooks/use-ratios";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { calculateObjectiveBreakdown } from "@/lib/objectifs";
import { useAppStore } from "@/stores/app-store";
import { formatCurrency } from "@/lib/formatters";
import { RATIO_ID_TO_EXPERTISE_ID, buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import { getAvgCommissionEur, deriveProfileLevel } from "@/lib/get-avg-commission";
import { ProgressBar } from "@/components/charts/progress-bar";
import { cn } from "@/lib/utils";
import type { UserCategory } from "@/types/user";
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
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Navigation,
  UserCog,
  ArrowRight,
  Sparkles,
} from "lucide-react";

/* ────── Types ────── */
type ObjectifsTab = "gps" | "niveau";
type NiveauChoice = UserCategory | "actuel";

type NiveauOption = {
  value: NiveauChoice;
  label: string;
  description: string;
  emoji: string;
};

const niveauOptions: (NiveauOption & { disabled?: boolean; disabledReason?: string })[] = [
  {
    value: "debutant",
    label: "Junior",
    description: "Moins de 2 ans d'expérience — ratios adaptés pour un démarrage progressif",
    emoji: "🌱",
  },
  {
    value: "confirme",
    label: "Confirmé",
    description: "2 à 5 ans d'expérience — ratios standards du marché",
    emoji: "💼",
  },
  {
    value: "expert",
    label: "Expert",
    description: "Plus de 5 ans d'expérience — ratios exigeants pour top performers",
    emoji: "🏆",
  },
  {
    value: "actuel",
    label: "Mon Niveau actuel",
    description: "Objectifs basés sur vos taux de transformation réels",
    emoji: "📊",
    disabled: true,
    disabledReason: "Disponible après 8-9 mois d'activité (volume de données insuffisant)",
  },
];

const ratioLabels: Partial<Record<RatioId, string>> = {
  contacts_rdv: "Contacts → RDV Estimation",
  rdv_mandats: "RDV → Mandats",
  pct_mandats_exclusifs: "% Mandats Exclusifs",
  acheteurs_visites: "Acheteurs → Visites",
  visites_offre: "Visites → Offre",
  offres_compromis: "Offres → Compromis",
  compromis_actes: "Compromis → Acte",
  honoraires_moyens: "Honoraires moyens",
};

const ratioIds: RatioId[] = [
  "contacts_rdv",
  "rdv_mandats",
  "pct_mandats_exclusifs",
  "acheteurs_visites",
  "visites_offre",
  "offres_compromis",
  "compromis_actes",
  "honoraires_moyens",
];

const funnelSteps = [
  { key: "estimationsNecessaires", label: "Estimations", icon: ClipboardCheck },
  { key: "mandatsNecessaires", label: "Mandats", icon: FileSignature },
  { key: "visitesNecessaires", label: "Visites", icon: Eye },
  { key: "offresNecessaires", label: "Offres", icon: FileText },
  { key: "compromisNecessaires", label: "Compromis", icon: Handshake },
  { key: "actesNecessaires", label: "Actes", icon: FileCheck },
] as const;

/* ────── Tabs config ────── */
const tabs: { id: ObjectifsTab; label: string; icon: typeof Target }[] = [
  { id: "gps", label: "Mon GPS", icon: Navigation },
  { id: "niveau", label: "Mon niveau", icon: UserCog },
];

export default function ObjectifsPage() {
  const { category } = useUser();
  const results = useResults();
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);

  /* ── Tab state ── */
  const [activeTab, setActiveTab] = useState<ObjectifsTab>("gps");

  /* ── GPS state ── */
  const [annualCA, setAnnualCA] = useState(120000);
  const [avgActValue, setAvgActValue] = useState(8000);
  const [gpsSaved, setGpsSaved] = useState(false);
  const [savedGps, setSavedGps] = useState<{ ca: number; avg: number } | null>(null);

  /* ── Niveau state — defaults to account category ── */
  const [selectedNiveau, setSelectedNiveau] = useState<NiveauChoice>(category);
  const [niveauSaved, setNiveauSaved] = useState(false);

  /* ── Ratios actuels (depuis Ma Performance) ── */
  const { computedRatios } = useRatios();

  /* ── Plan 30j (hook flywheel) ── */
  const router = useRouter();
  const currentUser = useAppStore((s) => s.user);
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const allResults = useAppStore((s) => s.results);
  const { getActivePlan, getActivePlanForRatio, createPlan30j } =
    useImprovementResources();
  const [improveToast, setImproveToast] = useState<
    { type: "success" | "error" | "info"; message: string } | null
  >(null);
  const [improving, setImproving] = useState(false);

  const daysElapsedSince = (iso: string) =>
    Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)));

  const navigateToPlan = () => router.push("/formation?tab=plan30");

  const handleImprove = async (ratioId: RatioId) => {
    const expertiseId = RATIO_ID_TO_EXPERTISE_ID[ratioId];
    if (!expertiseId) return;
    if (improving) return;
    if (!results) {
      setImproveToast({ type: "error", message: "Données de performance introuvables" });
      return;
    }
    setImproving(true);
    setImproveToast(null);
    try {
      const userHistory = allResults.filter((r) => r.userId === currentUser?.id);
      const measuredRatios = buildMeasuredRatios(computedRatios, results);
      const profile = deriveProfileLevel(category);
      const avgCommissionEur = getAvgCommissionEur(
        agencyObjective?.avgActValue,
        userHistory
      );
      await createPlan30j({
        mode: "targeted",
        ratioId: expertiseId,
        measuredRatios,
        profile,
        avgCommissionEur,
      });
      setImproveToast({ type: "success", message: "Plan 30 jours généré" });
      router.push("/formation?tab=plan30");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("PLAN_ACTIVE_ALREADY")) {
        setImproveToast({
          type: "info",
          message: "Vous avez déjà un plan actif, voici votre plan actuel",
        });
        router.push("/formation?tab=plan30");
      } else if (msg.startsWith("NO_PAIN_POINT")) {
        setImproveToast({ type: "info", message: "Aucun ratio en sous-performance détecté" });
      } else {
        setImproveToast({ type: "error", message: "Erreur lors de la création du plan" });
      }
    } finally {
      setImproving(false);
    }
  };

  /* ── Build custom ratioConfigs when "actuel" is selected ── */
  const effectiveRatioConfigs = useMemo(() => {
    if (selectedNiveau !== "actuel") return ratioConfigs;
    // Clone configs and override thresholds with actual performance values
    const custom = JSON.parse(JSON.stringify(ratioConfigs)) as typeof ratioConfigs;
    computedRatios.forEach((ratio) => {
      const id = ratio.ratioId as RatioId;
      if (custom[id]) {
        // Set all 3 levels to the actual value so any category lookup returns the real value
        custom[id].thresholds = {
          debutant: ratio.value,
          confirme: ratio.value,
          expert: ratio.value,
        };
      }
    });
    return custom;
  }, [selectedNiveau, ratioConfigs, computedRatios]);

  // Category to pass to calculation — when "actuel", use any category (all same)
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
    <LockedFeature feature="objectifs" featureName="Mes Objectifs" featureDescription="Définissez et suivez vos objectifs annuels">
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Mes Objectifs</h1>

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

      {/* ═══════════ TAB : Mon GPS ═══════════ */}
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
                  Mon GPS financier
                </h2>
                <p className="text-sm text-muted-foreground">
                  Définissez votre objectif annuel pour calculer les actions nécessaires
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Objectif CA annuel (€)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
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
                  Enregistrer mon GPS
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
                    {niveauOptions.find((n) => n.value === selectedNiveau)?.label ?? "Mon Niveau actuel"}
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
                Actions à entreprendre
              </h2>

              {/* CA Target */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
                <p className="text-sm text-muted-foreground">
                  Objectif CA Annuel
                </p>
                <p className="mt-1 text-3xl font-bold text-primary">
                  {formatCurrency(effectiveCA)}
                </p>
                <ProgressBar
                  value={
                    results
                      ? (results.ventes.chiffreAffaires / effectiveCA) * 100 * 12
                      : 0
                  }
                  label="Progression annuelle projetée"
                  status="ok"
                  className="mt-3"
                />
              </div>

              <div className="flex justify-center">
                <ArrowDown className="h-6 w-6 text-muted-foreground" />
              </div>

              {/* Steps Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {funnelSteps.map((step) => {
                  const value =
                    breakdown[step.key as keyof typeof breakdown];
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
                  status={
                    breakdown.pourcentageExclusivite >= 50 ? "ok" : "warning"
                  }
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

      {/* ═══════════ TAB : Mon Niveau ═══════════ */}
      {activeTab === "niveau" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
                <UserCog className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Choisir mon niveau
                </h2>
                <p className="text-sm text-muted-foreground">
                  Votre niveau détermine les ratios de transformation attendus et les actions à entreprendre
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {niveauOptions.map((option) => {
                const isSelected = selectedNiveau === option.value;
                const isDisabled = !!option.disabled;
                return (
                  <button
                    key={option.value}
                    onClick={() => !isDisabled && setSelectedNiveau(option.value)}
                    disabled={isDisabled}
                    className={cn(
                      "relative rounded-xl border-2 p-5 text-left transition-all",
                      isDisabled
                        ? "cursor-not-allowed border-border/50 bg-muted/20 opacity-50"
                        : isSelected
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30"
                    )}
                  >
                    {isSelected && !isDisabled && (
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
                    {isDisabled && option.disabledReason && (
                      <p className="mt-2 text-xs text-orange-400 italic">
                        {option.disabledReason}
                      </p>
                    )}
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
                  Enregistrer mon niveau
                </>
              )}
            </button>
          </div>

          {/* Ratios utilisés selon le niveau sélectionné */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-base font-semibold text-foreground">
              Ratios de transformation — {" "}
              <span className="text-primary">
                {niveauOptions.find((n) => n.value === selectedNiveau)?.label}
              </span>
            </h3>
            {improveToast && (
              <div
                className={cn(
                  "mb-3 flex items-start gap-3 rounded-lg border px-4 py-3",
                  improveToast.type === "success" && "border-green-500/30 bg-green-500/5",
                  improveToast.type === "error" && "border-red-500/30 bg-red-500/5",
                  improveToast.type === "info" && "border-amber-500/30 bg-amber-500/5"
                )}
              >
                {improveToast.type === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                ) : improveToast.type === "error" ? (
                  <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                )}
                <p className="flex-1 text-sm text-foreground">{improveToast.message}</p>
                <button
                  type="button"
                  onClick={() => setImproveToast(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Fermer
                </button>
              </div>
            )}
            <div className="space-y-3">
              {ratioIds.map((id) => {
                const config = ratioConfigs[id];
                const threshold = thresholdsForLevel[id];
                const expertiseId = RATIO_ID_TO_EXPERTISE_ID[id];
                const planForThis = expertiseId ? getActivePlanForRatio(expertiseId) : null;
                const anyActivePlan = getActivePlan();
                const hasPlanForThis = !!planForThis;
                const hasPlanForOther = !hasPlanForThis && !!anyActivePlan;
                const jPlus = planForThis
                  ? Math.min(30, daysElapsedSince(planForThis.created_at))
                  : 0;
                const ctaLabel = hasPlanForThis
                  ? `Reprendre (J+${jPlus}/30)`
                  : hasPlanForOther
                  ? "Voir mon plan actif"
                  : "Améliorer";

                return (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3"
                  >
                    <p className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
                      {ratioLabels[id]}
                    </p>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary shrink-0">
                      {config.isPercentage ? `${Math.round(threshold)}%` : Number(threshold).toFixed(1)}
                    </span>
                    {expertiseId && (
                      <button
                        type="button"
                        disabled={improving}
                        onClick={() => {
                          if (hasPlanForThis || hasPlanForOther) navigateToPlan();
                          else handleImprove(id);
                        }}
                        className={cn(
                          "shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                          hasPlanForThis || hasPlanForOther
                            ? "bg-primary/15 text-primary hover:bg-primary/25"
                            : "bg-primary text-primary-foreground hover:bg-primary/90",
                          improving && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        {!(hasPlanForThis || hasPlanForOther) && <Sparkles className="h-3 w-3" />}
                        {ctaLabel}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
    </LockedFeature>
  );
}
