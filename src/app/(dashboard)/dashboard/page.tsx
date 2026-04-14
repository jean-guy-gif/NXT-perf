"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Star,
  StarOff,
  LayoutDashboard,
  Link2,
  Calendar,
} from "lucide-react";
import { ProductionChain } from "@/components/dashboard/production-chain";
import { ProgressBar } from "@/components/charts/progress-bar";
import { usePlans, generatePlanFeedback } from "@/hooks/use-plans";
import type { PlanWithMeta } from "@/hooks/use-plans";
import { useUser } from "@/hooks/use-user";
import { useResults, useAllResults } from "@/hooks/use-results";
import { useYTDResults } from "@/hooks/use-ytd-results";
import { formatCurrency } from "@/lib/formatters";
import { CATEGORY_LABELS } from "@/lib/constants";
import { useAppStore } from "@/stores/app-store";
import { useWeeklyGate } from "@/hooks/use-weekly-gate";
import { WeeklyGateWrapper } from "@/components/dashboard/weekly-gate-wrapper";
import { useSupabaseResults } from "@/hooks/use-supabase-results";
import { cn } from "@/lib/utils";
import type { PeriodResults } from "@/types/results";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { aggregateResults } from "@/lib/aggregate-results";
import { DemoSaisieGate } from "@/components/saisie/demo-saisie-gate";

// ── Types ──────────────────────────────────────────────────────

type DashboardTab = "chaine" | "favoris";
type PeriodFilter = "ytd" | "mois" | "custom";

// Favorite items: 12 volume steps + 7 ratio steps
type FavoriteId =
  | "vol_1" | "vol_2" | "vol_3" | "vol_4" | "vol_5" | "vol_6"
  | "vol_7" | "vol_8" | "vol_9" | "vol_10" | "vol_11" | "vol_12"
  | "ratio_contacts_rdv" | "ratio_rdv_estim" | "ratio_estim_mandat"
  | "ratio_exclusivite" | "ratio_visites_offre" | "ratio_offres_compromis"
  | "ratio_compromis_acte";

interface FavoriteConfig {
  id: FavoriteId;
  label: string;
  group: "volume" | "ratio";
}

const allFavoriteItems: FavoriteConfig[] = [
  { id: "vol_1", label: "Contacts entrants", group: "volume" },
  { id: "vol_2", label: "RDV Estimation", group: "volume" },
  { id: "vol_3", label: "Estimations réalisées", group: "volume" },
  { id: "vol_4", label: "Mandats signés", group: "volume" },
  { id: "vol_5", label: "% Exclusivité", group: "volume" },
  { id: "vol_6", label: "Acheteurs chauds", group: "volume" },
  { id: "vol_7", label: "Visites réalisées", group: "volume" },
  { id: "vol_8", label: "Offres reçues", group: "volume" },
  { id: "vol_9", label: "Compromis signés", group: "volume" },
  { id: "vol_10", label: "Actes signés", group: "volume" },
  { id: "vol_11", label: "CA Compromis", group: "volume" },
  { id: "vol_12", label: "CA Acte", group: "volume" },
  { id: "ratio_contacts_rdv", label: "Contacts → RDV", group: "ratio" },
  { id: "ratio_rdv_estim", label: "RDV → Estimation", group: "ratio" },
  { id: "ratio_estim_mandat", label: "Estim. → Mandat", group: "ratio" },
  { id: "ratio_exclusivite", label: "% Exclusivité", group: "ratio" },
  { id: "ratio_visites_offre", label: "Visites → Offre", group: "ratio" },
  { id: "ratio_offres_compromis", label: "Offres → Compromis", group: "ratio" },
  { id: "ratio_compromis_acte", label: "Compromis → Acte", group: "ratio" },
];

const defaultFavorites: FavoriteId[] = [
  "vol_3", "vol_4", "vol_9", "vol_12",
  "ratio_estim_mandat", "ratio_visites_offre", "ratio_offres_compromis",
];

// ── Helpers ──────────────────────────────────────────────────────

function safeDiv(a: number, b: number): number {
  return b === 0 ? 0 : Math.round((a / b) * 10) / 10;
}

type RatioStatus = "surperf" | "stable" | "sousperf";

function getRatioStatus(realise: number, objectif: number, isLowerBetter: boolean): RatioStatus {
  if (objectif === 0) return "stable";
  if (isLowerBetter) {
    if (realise < objectif * 0.9) return "surperf";
    if (realise > objectif * 1.1) return "sousperf";
    return "stable";
  }
  if (realise > objectif * 1.1) return "surperf";
  if (realise < objectif * 0.9) return "sousperf";
  return "stable";
}

function getVolumeStatus(realise: number, objectif: number): RatioStatus {
  if (objectif === 0) return "stable";
  const pct = realise / objectif;
  if (pct >= 1.1) return "surperf";
  if (pct >= 0.9) return "stable";
  return "sousperf";
}

const STATUS_STYLE = {
  surperf: { text: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/30", label: "Surperf" },
  stable: { text: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Stable" },
  sousperf: { text: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", label: "Sous-perf" },
};

// ── Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { user } = useUser();
  const results = useResults();
  const ytdResults = useYTDResults();
  const allResultsData = useAllResults();
  const isDemo = useAppStore((s) => s.isDemo);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const { showGate, context: gateContext, isLoading: gateLoading, dismissGate, markSaisieDone, showResumeButton, reopenGate } = useWeeklyGate();
  const { allPlans, activePlans, terminatedPlans, expiredPlans, totalActions, doneActions, inProgressActions } = usePlans();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = usePersistedState<DashboardTab>("nxt-dashboard-tab-v2", "chaine");
  const [showPlansPanel, setShowPlansPanel] = useState(false);
  const [periodFilter, setPeriodFilter] = usePersistedState<PeriodFilter>("nxt-chain-period", "mois");
  const [favorites, setFavorites] = usePersistedState<FavoriteId[]>("nxt-dashboard-favorites-v2", defaultFavorites);
  const [editingFavorites, setEditingFavorites] = useState(false);

  // Custom month range for "Par période" (whole months only)
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`; // "2026-04"
  const [customMonthFrom, setCustomMonthFrom] = usePersistedState<string>("nxt-chain-mfrom", currentMonthKey);
  const [customMonthTo, setCustomMonthTo] = usePersistedState<string>("nxt-chain-mto", currentMonthKey);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Allow navigation via ?tab=...
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "favoris" || tab === "chaine") {
      setActiveTab(tab);
    }
  }, [searchParams, setActiveTab]);

  // Helper: count whole months between two "YYYY-MM" keys (inclusive)
  const countMonths = (from: string, to: string): number => {
    const [fy, fm] = from.split("-").map(Number);
    const [ty, tm] = to.split("-").map(Number);
    return Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);
  };

  // Helper: format "YYYY-MM" → "janvier 2026"
  const fmtMonth = (key: string): string => {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  };

  // Resolve period results
  const periodResults = useMemo((): PeriodResults | null => {
    if (!user) return null;
    if (periodFilter === "ytd") return ytdResults;
    if (periodFilter === "mois") return results;
    // Custom: aggregate whole months in [customMonthFrom, customMonthTo]
    const matching = allResultsData.filter((r) => {
      if (r.userId !== user.id || r.periodType !== "month") return false;
      const monthKey = r.periodStart.substring(0, 7); // "2026-02"
      return monthKey >= customMonthFrom && monthKey <= customMonthTo;
    });
    return aggregateResults(matching);
  }, [periodFilter, user, results, ytdResults, allResultsData, customMonthFrom, customMonthTo]);

  // Period label
  const periodLabel = useMemo(() => {
    if (periodFilter === "ytd") return `Depuis le 1er janvier ${new Date().getFullYear()}`;
    if (periodFilter === "mois") {
      return new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    }
    const n = countMonths(customMonthFrom, customMonthTo);
    if (n === 1) return fmtMonth(customMonthFrom);
    return `${fmtMonth(customMonthFrom)} → ${fmtMonth(customMonthTo)}`;
  }, [periodFilter, customMonthFrom, customMonthTo]);

  // Custom period month count for display
  const customMonthCount = periodFilter === "custom" ? countMonths(customMonthFrom, customMonthTo) : 0;

  // Month progress (for "mois" filter)
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const monthProgressPct = Math.round((currentDay / daysInMonth) * 100);

  // Number of months for objective scaling (whole months, no prorata)
  const periodMonthCount = useMemo(() => {
    if (periodFilter === "mois") return 1;
    if (periodFilter === "ytd") return now.getMonth() + 1;
    return countMonths(customMonthFrom, customMonthTo);
  }, [periodFilter, customMonthFrom, customMonthTo]);

  // Category (safe even when user is null)
  const category = user?.category ?? "confirme";

  // Favorite items data extraction from periodResults
  const favData = useMemo(() => {
    const r = periodResults;
    const contacts = r?.prospection.contactsTotaux ?? 0;
    const rdvEstim = r?.prospection.rdvEstimation ?? 0;
    const estimations = r?.vendeurs.estimationsRealisees ?? 0;
    const mandats = r?.vendeurs.mandatsSignes ?? 0;
    const mandatsExclu = r?.vendeurs.mandats.filter((m) => m.type === "exclusif").length ?? 0;
    const pctExclu = mandats > 0 ? Math.round((mandatsExclu / mandats) * 100) : 0;
    const acheteursSortis = r?.acheteurs.acheteursSortisVisite ?? 0;
    const visites = r?.acheteurs.nombreVisites ?? 0;
    const offres = r?.acheteurs.offresRecues ?? 0;
    const compromis = r?.acheteurs.compromisSignes ?? 0;
    const actes = r?.ventes.actesSignes ?? 0;
    const ca = r?.ventes.chiffreAffaires ?? 0;

    const catObj = { debutant: { estimations: 8, mandats: 4, exclusivite: 30, visites: 20, offres: 3, compromis: 1, actes: 1, ca: 8000 }, confirme: { estimations: 15, mandats: 8, exclusivite: 50, visites: 30, offres: 5, compromis: 3, actes: 2, ca: 20000 }, expert: { estimations: 20, mandats: 12, exclusivite: 70, visites: 40, offres: 8, compromis: 5, actes: 4, ca: 40000 } }[category] ?? { estimations: 15, mandats: 8, exclusivite: 50, visites: 30, offres: 5, compromis: 3, actes: 2, ca: 20000 };

    const m = periodMonthCount;

    const volumes: Record<string, { label: string; realise: number; objectif: number; unit?: string }> = {
      vol_1: { label: "Contacts totaux", realise: contacts, objectif: catObj.estimations * 15 * m },
      vol_2: { label: "RDV Estimation", realise: rdvEstim, objectif: catObj.estimations * m },
      vol_3: { label: "Estimations réalisées", realise: estimations, objectif: catObj.estimations * m },
      vol_4: { label: "Mandats signés", realise: mandats, objectif: catObj.mandats * m },
      vol_5: { label: "% Exclusivité", realise: pctExclu, objectif: catObj.exclusivite, unit: "%" },
      vol_6: { label: "Acheteurs sortis", realise: acheteursSortis, objectif: catObj.mandats * 2 * m },
      vol_7: { label: "Visites réalisées", realise: visites, objectif: catObj.visites * m },
      vol_8: { label: "Offres reçues", realise: offres, objectif: catObj.offres * m },
      vol_9: { label: "Compromis signés", realise: compromis, objectif: catObj.compromis * m },
      vol_10: { label: "Actes signés", realise: actes, objectif: catObj.actes * m },
      vol_11: { label: "CA Compromis", realise: compromis > 0 ? Math.round(ca * (compromis / Math.max(1, actes))) : 0, objectif: catObj.ca * m, unit: "€" },
      vol_12: { label: "CA Acte", realise: ca, objectif: catObj.ca * m, unit: "€" },
    };

    const ratioThresholds = ratioConfigs;
    const t = (id: string) => ratioThresholds[id as keyof typeof ratioThresholds]?.thresholds?.[category] ?? 0;

    const ratios: Record<string, { label: string; realise: number; objectif: number; realisePct: number; objectifPct: number; isLowerBetter: boolean }> = {
      ratio_contacts_rdv: { label: "Contacts → RDV", realise: safeDiv(contacts, rdvEstim), objectif: t("contacts_rdv"), realisePct: rdvEstim > 0 ? Math.round((rdvEstim / contacts) * 100) : 0, objectifPct: t("contacts_rdv") > 0 ? Math.round((1 / t("contacts_rdv")) * 100) : 0, isLowerBetter: true },
      ratio_rdv_estim: { label: "RDV → Estimation", realise: safeDiv(rdvEstim, estimations), objectif: 1.5, realisePct: estimations > 0 ? Math.round((estimations / rdvEstim) * 100) : 0, objectifPct: 67, isLowerBetter: true },
      ratio_estim_mandat: { label: "RDV → Mandat", realise: safeDiv(rdvEstim, mandats), objectif: t("rdv_mandats"), realisePct: mandats > 0 ? Math.round((mandats / rdvEstim) * 100) : 0, objectifPct: t("rdv_mandats") > 0 ? Math.round((1 / t("rdv_mandats")) * 100) : 0, isLowerBetter: true },
      ratio_exclusivite: { label: "% Exclusivité", realise: pctExclu, objectif: t("pct_mandats_exclusifs"), realisePct: pctExclu, objectifPct: t("pct_mandats_exclusifs"), isLowerBetter: false },
      ratio_visites_offre: { label: "Visites → Offre", realise: safeDiv(visites, offres), objectif: t("visites_offre"), realisePct: offres > 0 ? Math.round((offres / visites) * 100) : 0, objectifPct: t("visites_offre") > 0 ? Math.round((1 / t("visites_offre")) * 100) : 0, isLowerBetter: true },
      ratio_offres_compromis: { label: "Offres → Compromis", realise: safeDiv(offres, compromis), objectif: t("offres_compromis"), realisePct: compromis > 0 ? Math.round((compromis / offres) * 100) : 0, objectifPct: t("offres_compromis") > 0 ? Math.round((1 / t("offres_compromis")) * 100) : 0, isLowerBetter: true },
      ratio_compromis_acte: { label: "Compromis → Acte", realise: safeDiv(compromis, actes), objectif: 1.5, realisePct: actes > 0 ? Math.round((actes / compromis) * 100) : 0, objectifPct: 67, isLowerBetter: true },
    };

    return { volumes, ratios };
  }, [periodResults, category, periodMonthCount, ratioConfigs]);

  const toggleFavorite = (id: FavoriteId) => {
    setFavorites((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  };

  // Demo saisie gate
  const showDemoGate = isDemo
    && searchParams.get("gate") === "1"
    && typeof document !== "undefined"
    && !document.cookie.includes("nxt-demo-saisie=true");

  // ── Early returns (AFTER all hooks) ──

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (showDemoGate) {
    return (
      <DemoSaisieGate onComplete={() => { window.location.href = "/dashboard"; }} />
    );
  }

  if (!gateLoading && showGate) {
    return <WeeklyGateWrapper context={gateContext} onDismiss={dismissGate} onSaisieDone={markSaisieDone} />;
  }

  // Empty state
  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-5">
          <LayoutDashboard className="h-8 w-8 text-primary/50" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Bienvenue sur NXT Performance, {user.firstName}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-6">
          Commencez par saisir vos premiers résultats pour voir votre dashboard prendre vie.
        </p>
        <a href="/saisie" className="inline-block rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          Faire ma première saisie
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top tabs ── */}
      <div className="flex items-center border-b border-border/50 pb-3">
        <div className="flex items-center gap-8">
          <button
            onClick={() => setActiveTab("chaine")}
            className={cn(
              "flex items-center gap-2 pb-3 text-sm font-medium transition-colors",
              activeTab === "chaine"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Link2 className="h-4 w-4" />
            Chaîne de production
          </button>
          <button
            onClick={() => setActiveTab("favoris")}
            className={cn(
              "flex items-center gap-2 pb-3 text-sm font-medium transition-colors",
              activeTab === "favoris"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Star className="h-4 w-4" />
            Favoris
          </button>
        </div>
        {showResumeButton && (
          <button type="button" onClick={reopenGate}
            className="ml-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
            Compléter ma saisie
          </button>
        )}
      </div>

      {/* ═══ Bandeau Mes plans — cliquable ═══ */}
      {allPlans.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowPlansPanel(!showPlansPanel)}
            className="w-full flex items-center justify-between border border-primary/20 bg-primary/5 px-5 py-3 hover:bg-primary/8 transition-all text-left"
            style={{ borderRadius: "var(--radius-card)" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-base">{"\uD83D\uDCC5"}</span>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {activePlans.length > 0 && <>{activePlans.length} plan{activePlans.length > 1 ? "s" : ""} actif{activePlans.length > 1 ? "s" : ""}</>}
                  {activePlans.length > 0 && (terminatedPlans.length > 0 || expiredPlans.length > 0) && " · "}
                  {terminatedPlans.length > 0 && <span className="text-green-500">{terminatedPlans.length} {"terminé"}{terminatedPlans.length > 1 ? "s" : ""}</span>}
                  {expiredPlans.length > 0 && <span className="text-amber-500"> · {expiredPlans.length} {"expiré"}{expiredPlans.length > 1 ? "s" : ""}</span>}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {doneActions}/{totalActions} actions · {showPlansPanel ? "Cliquez pour fermer" : "Cliquez pour voir tous vos plans"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-28">
                <div className="h-2 rounded-full bg-border/30 overflow-hidden">
                  <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${totalActions > 0 ? Math.round((doneActions / totalActions) * 100) : 0}%` }} />
                </div>
              </div>
              <span className="text-xs font-bold text-primary tabular-nums">
                {totalActions > 0 ? Math.round((doneActions / totalActions) * 100) : 0}%
              </span>
            </div>
          </button>

          {/* ═══ Panneau Mes plans ═══ */}
          {showPlansPanel && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-foreground">Mes plans 30 jours</h3>

              {/* Plans actifs */}
              {activePlans.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{"Actifs"}</p>
                  {activePlans.map((m) => <PlanCard key={m.ratioId} meta={m} />)}
                </div>
              )}

              {/* Plans terminés */}
              {terminatedPlans.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider">{"Terminés"}</p>
                  {terminatedPlans.map((m) => <PlanCard key={m.ratioId} meta={m} />)}
                </div>
              )}

              {/* Plans expirés */}
              {expiredPlans.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">{"Expirés"}</p>
                  {expiredPlans.map((m) => <PlanCard key={m.ratioId} meta={m} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══════ TAB: CHAÎNE DE PRODUCTION ═══════ */}
      {activeTab === "chaine" && (
        <div className="space-y-4">
          {/* Period selector + context bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border border-primary/15 bg-primary/5 px-5 py-3.5" style={{ borderRadius: "var(--radius-card)" }}>
            <div className="flex items-center gap-3">
              <Calendar className="h-4.5 w-4.5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground capitalize">{periodLabel}</p>
                {periodFilter === "mois" && (
                  <p className="text-xs text-muted-foreground">
                    Jour {currentDay}/{daysInMonth} — {monthProgressPct}% du mois
                  </p>
                )}
                {periodFilter === "ytd" && (
                  <p className="text-xs text-muted-foreground">
                    {now.getMonth() + 1} mois cumulés — profil {CATEGORY_LABELS[category]}
                  </p>
                )}
                {periodFilter === "custom" && (
                  <p className="text-xs text-muted-foreground">
                    {customMonthCount} mois — profil {CATEGORY_LABELS[category]}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Period pills */}
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                <button
                  onClick={() => { setPeriodFilter("ytd"); setShowCustomPicker(false); }}
                  className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    periodFilter === "ytd" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  Depuis le début de l&apos;année
                </button>
                <button
                  onClick={() => { setPeriodFilter("mois"); setShowCustomPicker(false); }}
                  className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    periodFilter === "mois" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  Ce mois-ci
                </button>
                <button
                  onClick={() => { setPeriodFilter("custom"); setShowCustomPicker((v) => !v); }}
                  className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    periodFilter === "custom" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  Par période
                </button>
              </div>
            </div>
          </div>

          {/* Custom month range picker */}
          {periodFilter === "custom" && showCustomPicker && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                De
                <input
                  type="month"
                  value={customMonthFrom}
                  onChange={(e) => {
                    setCustomMonthFrom(e.target.value);
                    if (e.target.value > customMonthTo) setCustomMonthTo(e.target.value);
                  }}
                  className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                à
                <input
                  type="month"
                  value={customMonthTo}
                  onChange={(e) => setCustomMonthTo(e.target.value)}
                  min={customMonthFrom}
                  className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                {customMonthCount} mois
              </span>
            </div>
          )}

          {/* Month progress bar for "mois" */}
          {periodFilter === "mois" && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground shrink-0">Progression du mois</span>
              <div className="flex-1">
                <ProgressBar value={monthProgressPct} status="ok" showValue size="sm" />
              </div>
            </div>
          )}

          {/* ═══ PRODUCTION CHAIN ═══ */}
          <ProductionChain
            scope="individual"
            userId={user.id}
            resultsOverride={periodResults}
            periodMonths={periodMonthCount}
            periodMode={periodFilter === "ytd" ? "ytd" : periodFilter === "mois" ? "mois" : "custom"}
          />
        </div>
      )}

      {/* ═══════ TAB: FAVORIS ═══════ */}
      {activeTab === "favoris" && (
        <div className="space-y-6">
          {/* Period selector (same as chain) */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button onClick={() => { setPeriodFilter("ytd"); setShowCustomPicker(false); }}
                className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  periodFilter === "ytd" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                Depuis le début de l&apos;année
              </button>
              <button onClick={() => { setPeriodFilter("mois"); setShowCustomPicker(false); }}
                className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  periodFilter === "mois" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                Ce mois-ci
              </button>
              <button onClick={() => { setPeriodFilter("custom"); setShowCustomPicker((v) => !v); }}
                className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  periodFilter === "custom" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                Par période
              </button>
            </div>
            <button
              onClick={() => setEditingFavorites(!editingFavorites)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                editingFavorites
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-foreground hover:bg-muted"
              )}
            >
              {editingFavorites ? <><Star className="h-4 w-4" /> Terminer</> : <><Star className="h-4 w-4" /> Personnaliser</>}
            </button>
          </div>

          {/* Edit mode: picker */}
          {editingFavorites && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Volumes ({favorites.filter((f) => f.startsWith("vol_")).length}/12)
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {allFavoriteItems.filter((f) => f.group === "volume").map((w) => {
                    const active = favorites.includes(w.id);
                    return (
                      <button key={w.id} onClick={() => toggleFavorite(w.id)}
                        className={cn("flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition-colors",
                          active ? "border-primary/50 bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted")}>
                        {active ? <Star className="h-3.5 w-3.5 shrink-0 text-primary fill-primary" /> : <StarOff className="h-3.5 w-3.5 shrink-0" />}
                        <span className="truncate">{w.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ratios ({favorites.filter((f) => f.startsWith("ratio_")).length}/7)
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {allFavoriteItems.filter((f) => f.group === "ratio").map((w) => {
                    const active = favorites.includes(w.id);
                    return (
                      <button key={w.id} onClick={() => toggleFavorite(w.id)}
                        className={cn("flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition-colors",
                          active ? "border-primary/50 bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted")}>
                        {active ? <Star className="h-3.5 w-3.5 shrink-0 text-primary fill-primary" /> : <StarOff className="h-3.5 w-3.5 shrink-0" />}
                        <span className="truncate">{w.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Period label */}
          <p className="text-xs text-muted-foreground capitalize">{periodLabel} — profil {CATEGORY_LABELS[category]}</p>

          {/* Favorite cards */}
          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {favorites.map((fid) => {
                const isVolume = fid.startsWith("vol_");
                if (isVolume) {
                  const vol = favData.volumes[fid];
                  if (!vol) return null;
                  const status = vol.unit === "%" ? getRatioStatus(vol.realise, vol.objectif, false) : getVolumeStatus(vol.realise, vol.objectif);
                  const s = STATUS_STYLE[status];
                  const delta = vol.realise - vol.objectif;
                  const fmtVal = (v: number) => vol.unit === "€" ? formatCurrency(v) : vol.unit === "%" ? `${v}%` : String(v);

                  return (
                    <div key={fid} className={cn("border p-4 space-y-2.5", s.border, s.bg)} style={{ borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-1)" }}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground">{vol.label}</p>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", s.text, s.bg)}>{s.label}</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-extrabold text-foreground tracking-tight tabular-nums">{fmtVal(vol.realise)}</span>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground">obj. {fmtVal(vol.objectif)}</span>
                          <p className={cn("text-xs font-bold tabular-nums", s.text)}>
                            {delta >= 0 ? "+" : ""}{fmtVal(delta)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Ratio card
                const ratio = favData.ratios[fid];
                if (!ratio) return null;
                const status = getRatioStatus(ratio.realise, ratio.objectif, ratio.isLowerBetter);
                const s = STATUS_STYLE[status];

                return (
                  <div key={fid} className={cn("border p-4 space-y-2.5", s.border, s.bg)} style={{ borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-1)" }}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground">{ratio.label}</p>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", s.text, s.bg)}>{s.label}</span>
                    </div>
                    <p className="text-sm text-foreground">
                      {"Réalisé : "}<span className="font-bold tabular-nums">{ratio.realise}</span> pour 1
                      {ratio.realisePct > 0 && <span className="text-muted-foreground"> · {ratio.realisePct}%</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Obj. {CATEGORY_LABELS[category]} : {ratio.objectif} pour 1
                      {ratio.objectifPct > 0 && <span> · {ratio.objectifPct}%</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
              <StarOff className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Aucun favori sélectionné. Cliquez sur <strong>Personnaliser</strong> pour choisir vos indicateurs.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Plan Card (for "Mes plans" panel)                                  */
/* ------------------------------------------------------------------ */

function PlanCard({ meta }: { meta: PlanWithMeta }) {
  const [showDetail, setShowDetail] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const { getPlan, updateActionStatus } = usePlans();
  // Read fresh plan data from hook (not just from prop snapshot)
  const freshPlan = getPlan(meta.ratioId) ?? meta.plan;
  const area = freshPlan.priorities[0]?.label ?? "Performance";
  const created = meta.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const ends = meta.endsAt.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const canFeedback = meta.status === "termine" || meta.status === "expire";
  // Recompute fresh stats for feedback
  const freshAllActions = freshPlan.weeks.flatMap((w) => w.actions);
  const freshDone = freshAllActions.filter((a) => a.status === "done").length;
  const freshTotal = freshAllActions.length;
  const freshPct = freshTotal > 0 ? Math.round((freshDone / freshTotal) * 100) : 0;
  const freshMeta = { ...meta, plan: freshPlan, doneActions: freshDone, totalActions: freshTotal, progressPct: freshPct };
  const feedback = canFeedback ? generatePlanFeedback(freshMeta) : null;

  const RATIO_LABELS: Record<string, string> = {
    contacts_rdv: "Contacts \u2192 RDV", rdv_mandats: "RDV \u2192 Mandats",
    pct_mandats_exclusifs: "% Exclusivit\u00E9", acheteurs_visites: "Acheteurs \u2192 Visites",
    visites_offre: "Visites \u2192 Offre", offres_compromis: "Offres \u2192 Compromis",
    compromis_actes: "Compromis \u2192 Acte", honoraires_moyens: "Honoraires moyens",
  };

  const statusStyle = {
    actif: { bg: "bg-primary/10", text: "text-primary", label: "Actif" },
    termine: { bg: "bg-green-500/10", text: "text-green-500", label: "Terminé" },
    expire: { bg: "bg-amber-500/10", text: "text-amber-500", label: "Expiré" },
  }[meta.status];

  const cycleStatus = (actionId: string, current: string) => {
    const next = current === "todo" ? "in_progress" : current === "in_progress" ? "done" : "todo";
    updateActionStatus(meta.ratioId, actionId, next as "todo" | "in_progress" | "done");
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-foreground">{area}</p>
          <span className={cn("rounded-full px-1.5 py-0.5 text-[8px] font-bold", statusStyle.bg, statusStyle.text)}>
            {statusStyle.label}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {RATIO_LABELS[meta.ratioId] ?? meta.ratioId}
        </span>
      </div>

      {/* Dates */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span>{"Créé le"} {created}</span>
        <span>{"Fin le"} {ends}</span>
        {meta.status === "actif" && (
          <span className="font-bold text-primary">{meta.daysRemaining}j restants</span>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-border/50 overflow-hidden">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${freshPct}%` }} />
        </div>
        <span className="text-[10px] font-bold text-foreground">{freshPct}%</span>
        <span className="text-[10px] text-muted-foreground">{freshDone}/{freshTotal}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setShowDetail(!showDetail)}
          className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-[10px] font-bold text-primary hover:bg-primary/20 transition-colors">
          {showDetail ? "Masquer les actions" : "Voir les actions"}
        </button>
        {canFeedback && (
          <button type="button" onClick={() => { setShowFeedback(!showFeedback); setShowDetail(false); }}
            className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-[10px] font-bold text-green-600 hover:bg-green-500/20 transition-colors">
            {showFeedback ? "Masquer le bilan" : "Bilan NXT Coaching — Offert"}
          </button>
        )}
      </div>

      {/* Detail: actions with clickable statuses */}
      {showDetail && (
        <div className="space-y-2 pt-1">
          {freshPlan.weeks.map((week) => (
            <div key={week.weekNumber} className="rounded-lg bg-card border border-border/50 p-2.5">
              <p className="text-[9px] font-bold text-primary uppercase mb-1.5">Semaine {week.weekNumber}</p>
              <div className="space-y-1">
                {week.actions.map((action) => (
                  <button key={action.id} type="button"
                    onClick={() => cycleStatus(action.id, action.status)}
                    className={cn("flex w-full items-start gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/50",
                      action.status === "done" && "opacity-60")}
                  >
                    <span className="shrink-0 text-sm mt-0.5">
                      {action.status === "done" ? "\u2705" : action.status === "in_progress" ? "\uD83D\uDD04" : "\u2B1C"}
                    </span>
                    <span className={cn("text-[10px] leading-snug flex-1",
                      action.status === "done" ? "text-muted-foreground line-through" : "text-foreground")}>
                      {action.label}
                    </span>
                    <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold",
                      action.status === "done" ? "bg-green-500/15 text-green-500"
                        : action.status === "in_progress" ? "bg-amber-500/15 text-amber-500"
                          : "bg-muted text-muted-foreground")}>
                      {action.status === "done" ? "Terminé" : action.status === "in_progress" ? "En cours" : "À faire"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feedback NXT Coaching */}
      {showFeedback && feedback && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-base">{"\uD83C\uDFAF"}</span>
            <p className="text-xs font-bold text-foreground">{feedback.title}</p>
            <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[8px] font-bold text-green-600 uppercase">Offert</span>
          </div>
          <p className="text-[10px] text-muted-foreground">{feedback.summary}</p>
          {feedback.doneList.length > 0 && (
            <div>
              <p className="text-[9px] font-bold text-green-600 uppercase mb-1">{"Réalisé"}</p>
              <ul className="space-y-0.5">
                {feedback.doneList.slice(0, 5).map((a, i) => (
                  <li key={i} className="text-[10px] text-foreground flex items-start gap-1.5">
                    <span className="text-green-500 shrink-0">{"✓"}</span>{a}
                  </li>
                ))}
                {feedback.doneList.length > 5 && <li className="text-[10px] text-muted-foreground">+{feedback.doneList.length - 5} autres</li>}
              </ul>
            </div>
          )}
          {feedback.missedList.length > 0 && (
            <div>
              <p className="text-[9px] font-bold text-amber-500 uppercase mb-1">{"Non réalisé"}</p>
              <ul className="space-y-0.5">
                {feedback.missedList.slice(0, 3).map((a, i) => (
                  <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                    <span className="text-amber-500 shrink-0">{"○"}</span>{a}
                  </li>
                ))}
                {feedback.missedList.length > 3 && <li className="text-[10px] text-muted-foreground">+{feedback.missedList.length - 3} autres</li>}
              </ul>
            </div>
          )}
          <div className="rounded-lg bg-card border border-border p-2.5">
            <p className="text-[9px] font-bold text-primary uppercase mb-1">{"Recommandation NXT Coaching"}</p>
            <p className="text-[10px] text-foreground">{feedback.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

