"use client";

import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useResults, useAllResults } from "@/hooks/use-results";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { CATEGORY_OBJECTIVES, CATEGORY_LABELS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { PeriodResults } from "@/types/results";
import type { UserCategory } from "@/types/user";

// ── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "volumes" | "ratios" | "both";
type Status = "surperf" | "stable" | "sousperf";

interface StepVolume {
  num: number;
  label: string;
  realise: number;
  objectif: number;
  unit?: string;
}

interface StepRatio {
  num: number;
  label: string;
  from: string;
  to: string;
  realise: number; // ratio value (e.g. 10 contacts per RDV)
  objectif: number;
  realisePct: number; // transformation %
  objectifPct: number;
  isLowerBetter: boolean;
  status: Status;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStatus(realise: number, objectif: number, isLowerBetter: boolean): Status {
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

function getVolumeStatus(realise: number, objectif: number): Status {
  if (objectif === 0) return "stable";
  const pct = realise / objectif;
  if (pct >= 1.1) return "surperf";
  if (pct >= 0.9) return "stable";
  return "sousperf";
}

const STATUS_CONFIG = {
  surperf: { borderColor: "#22c55e", bg: "bg-green-500/5", text: "text-green-500", label: "Surperf", arrow: "↑" },
  stable:  { borderColor: "#f59e0b", bg: "bg-amber-500/5", text: "text-amber-500", label: "Stable", arrow: "=" },
  sousperf:{ borderColor: "#ef4444", bg: "bg-red-500/5",   text: "text-red-500",   label: "Sous-perf", arrow: "↓" },
};

function safeDiv(a: number, b: number): number {
  return b === 0 ? 0 : Math.round((a / b) * 10) / 10;
}

function formatVal(v: number, unit?: string): string {
  if (unit === "€") return v.toLocaleString("fr-FR") + " €";
  if (unit === "%") return v + "%";
  return String(v);
}

// ── Aggregate helper ─────────────────────────────────────────────────────────

function aggregateResults(results: PeriodResults[]): PeriodResults | null {
  if (results.length === 0) return null;
  const b = results[0];
  return {
    ...b,
    prospection: {
      ...b.prospection,
      contactsEntrants: results.reduce((s, r) => s + r.prospection.contactsEntrants, 0),
      contactsTotaux: results.reduce((s, r) => s + r.prospection.contactsTotaux, 0),
      rdvEstimation: results.reduce((s, r) => s + r.prospection.rdvEstimation, 0),
    },
    vendeurs: {
      ...b.vendeurs,
      estimationsRealisees: results.reduce((s, r) => s + r.vendeurs.estimationsRealisees, 0),
      mandatsSignes: results.reduce((s, r) => s + r.vendeurs.mandatsSignes, 0),
      mandats: results.flatMap((r) => r.vendeurs.mandats),
      rdvSuivi: results.reduce((s, r) => s + r.vendeurs.rdvSuivi, 0),
      requalificationSimpleExclusif: results.reduce((s, r) => s + r.vendeurs.requalificationSimpleExclusif, 0),
      baissePrix: results.reduce((s, r) => s + r.vendeurs.baissePrix, 0),
    },
    acheteurs: {
      ...b.acheteurs,
      nombreVisites: results.reduce((s, r) => s + r.acheteurs.nombreVisites, 0),
      offresRecues: results.reduce((s, r) => s + r.acheteurs.offresRecues, 0),
      compromisSignes: results.reduce((s, r) => s + r.acheteurs.compromisSignes, 0),
      acheteursSortisVisite: results.reduce((s, r) => s + r.acheteurs.acheteursSortisVisite, 0),
      acheteursChauds: results.flatMap((r) => r.acheteurs.acheteursChauds),
    },
    ventes: {
      actesSignes: results.reduce((s, r) => s + r.ventes.actesSignes, 0),
      chiffreAffaires: results.reduce((s, r) => s + r.ventes.chiffreAffaires, 0),
      delaiMoyenVente: 0,
    },
  };
}

// ── Props ────────────────────────────────────────────────────────────────────

interface ProductionChainProps {
  scope: "individual" | "team" | "agency";
  userId?: string;
  teamId?: string;
  agencyId?: string;
  profile?: UserCategory;
}

// ── Objectifs : GPS (Supabase) > Catégorie (constantes) ─────────────────────
//
// Résolution par métrique :
//   1. Si l'utilisateur a rempli le GPS onboarding cette année
//      → table `objectives`, champ `breakdown` (jsonb)
//      → on utilise la valeur GPS pour chaque métrique présente et > 0
//   2. Sinon, ou si une métrique GPS est absente / à 0
//      → fallback sur CATEGORY_OBJECTIVES[category] (Junior / Confirmé / Expert)
//
// Le GPS ne collecte pas offres, compromis, actes
// → ces 3 métriques tombent toujours en fallback catégorie.

interface GpsBreakdown {
  estimations?: number;
  mandats?: number;
  exclusivite?: number;
  visites?: number;
  ca?: number;
  offres?: number;
  compromis?: number;
  actes?: number;
}

/** Pour chaque métrique : GPS si > 0, sinon catégorie. */
function resolveObjectives(
  gps: GpsBreakdown | null,
  fallback: typeof CATEGORY_OBJECTIVES["confirme"],
) {
  if (!gps) return { source: "category" as const, values: fallback };

  const values = {
    estimations: (gps.estimations && gps.estimations > 0) ? gps.estimations : fallback.estimations,
    mandats:     (gps.mandats && gps.mandats > 0)         ? gps.mandats     : fallback.mandats,
    exclusivite: (gps.exclusivite && gps.exclusivite > 0) ? gps.exclusivite : fallback.exclusivite,
    visites:     (gps.visites && gps.visites > 0)         ? gps.visites     : fallback.visites,
    offres:      (gps.offres && gps.offres > 0)           ? gps.offres      : fallback.offres,
    compromis:   (gps.compromis && gps.compromis > 0)     ? gps.compromis   : fallback.compromis,
    actes:       (gps.actes && gps.actes > 0)             ? gps.actes       : fallback.actes,
    ca:          (gps.ca && gps.ca > 0)                   ? gps.ca          : fallback.ca,
  };

  return { source: "gps" as const, values };
}

// ── Component ────────────────────────────────────────────────────────────────

export function ProductionChain({ scope, userId, teamId, profile: profileProp }: ProductionChainProps) {
  const [viewMode, setViewMode] = usePersistedState<ViewMode>("nxt-chain-view", "volumes");
  const [gpsBreakdown, setGpsBreakdown] = useState<GpsBreakdown | null>(null);

  const allResults = useAllResults();
  const individualResult = useResults(userId);
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);
  const category: UserCategory = profileProp ?? currentUser?.category ?? "confirme";
  const categoryObj = CATEGORY_OBJECTIVES[category];

  // Charger les objectifs GPS depuis Supabase (scope individual uniquement)
  const targetUserId = scope === "individual" ? (userId ?? currentUser?.id) : null;
  useEffect(() => {
    if (isDemo || !targetUserId) return;
    const supabase = createClient();
    const currentYear = new Date().getFullYear();
    supabase.from("objectives").select("breakdown")
      .eq("user_id", targetUserId).eq("year", currentYear).single()
      .then(({ data }) => {
        if (data?.breakdown && typeof data.breakdown === "object") {
          const b = data.breakdown as Record<string, number>;
          // Au moins une métrique significative → considérer comme GPS valide
          if (b.estimations > 0 || b.mandats > 0 || b.ca > 0) {
            setGpsBreakdown(b as GpsBreakdown);
          }
        }
      });
  }, [isDemo, targetUserId]);

  // Résolution explicite : GPS > catégorie, par métrique
  const { source: objectifSource, values: obj } = useMemo(
    () => resolveObjectives(gpsBreakdown, categoryObj),
    [gpsBreakdown, categoryObj],
  );

  // Scope-based result
  const scopedResult = useMemo((): PeriodResults | null => {
    if (scope === "individual") return individualResult;
    if (scope === "team") {
      const tid = teamId ?? currentUser?.teamId;
      const teamUsers = users.filter((u) => u.role === "conseiller" && (isDemo ? u.teamId === tid : u.managerId === currentUser?.id));
      return aggregateResults(teamUsers.map((u) => allResults.find((r) => r.userId === u.id)).filter(Boolean) as PeriodResults[]);
    }
    if (scope === "agency") {
      const orgId = currentUser?.institutionId;
      const agencyUsers = users.filter((u) => (u.role === "conseiller" || u.role === "manager") && u.institutionId === orgId);
      return aggregateResults(agencyUsers.map((u) => allResults.find((r) => r.userId === u.id)).filter(Boolean) as PeriodResults[]);
    }
    return null;
  }, [scope, userId, teamId, individualResult, allResults, users, currentUser, isDemo]);

  const headcount = useMemo(() => {
    if (scope === "individual") return 1;
    if (scope === "team") {
      const tid = teamId ?? currentUser?.teamId;
      return users.filter((u) => u.role === "conseiller" && (isDemo ? u.teamId === tid : u.managerId === currentUser?.id)).length || 1;
    }
    return users.filter((u) => (u.role === "conseiller" || u.role === "manager") && u.institutionId === currentUser?.institutionId).length || 1;
  }, [scope, teamId, users, currentUser, isDemo]);

  // Extract values (0 if no data — always show objectives)
  const r = scopedResult;
  const contacts = r?.prospection.contactsEntrants ?? 0;
  const rdvEstim = r?.prospection.rdvEstimation ?? 0;
  const estimations = r?.vendeurs.estimationsRealisees ?? 0;
  const mandats = r?.vendeurs.mandatsSignes ?? 0;
  const mandatsExclu = r?.vendeurs.mandats.filter((m) => m.type === "exclusif").length ?? 0;
  const pctExclu = mandats > 0 ? Math.round((mandatsExclu / mandats) * 100) : 0;
  const acheteursChauds = r?.acheteurs.acheteursChauds.length ?? 0;
  const visites = r?.acheteurs.nombreVisites ?? 0;
  const offres = r?.acheteurs.offresRecues ?? 0;
  const compromis = r?.acheteurs.compromisSignes ?? 0;
  const actes = r?.ventes.actesSignes ?? 0;
  const ca = r?.ventes.chiffreAffaires ?? 0;
  const caParActe = actes > 0 ? Math.round(ca / actes) : 0;

  // Volumes
  const volumes: StepVolume[] = [
    { num: 1, label: "Contacts entrants", realise: contacts, objectif: obj.estimations * 15 * headcount },
    { num: 2, label: "RDV Estimation", realise: rdvEstim, objectif: obj.estimations * headcount },
    { num: 3, label: "Estimations réalisées", realise: estimations, objectif: obj.estimations * headcount },
    { num: 4, label: "Mandats signés", realise: mandats, objectif: obj.mandats * headcount },
    { num: 5, label: "% Exclusivité", realise: pctExclu, objectif: obj.exclusivite, unit: "%" },
    { num: 6, label: "Acheteurs chauds", realise: acheteursChauds, objectif: obj.mandats * 2 * headcount },
    { num: 7, label: "Visites réalisées", realise: visites, objectif: obj.visites * headcount },
    { num: 8, label: "Offres reçues", realise: offres, objectif: obj.offres * headcount },
    { num: 9, label: "Compromis signés", realise: compromis, objectif: obj.compromis * headcount },
    { num: 10, label: "Actes signés", realise: actes, objectif: obj.actes * headcount },
    { num: 11, label: "CA Compromis", realise: compromis > 0 ? Math.round(ca * (compromis / Math.max(1, actes))) : 0, objectif: obj.ca * headcount, unit: "€" },
    { num: 12, label: "CA Acte", realise: ca, objectif: obj.ca * headcount, unit: "€" },
  ];

  // Ratios (only steps with ratio data)
  const ratios: StepRatio[] = [
    { num: 2, label: "Contacts → RDV", from: "contacts", to: "RDV", realise: safeDiv(contacts, rdvEstim), objectif: 15, realisePct: rdvEstim > 0 ? Math.round((rdvEstim / contacts) * 100) : 0, objectifPct: Math.round((1 / 15) * 100), isLowerBetter: true, status: "stable" },
    { num: 3, label: "RDV → Estimation", from: "RDV", to: "estimation", realise: safeDiv(rdvEstim, estimations), objectif: 1.5, realisePct: estimations > 0 ? Math.round((estimations / rdvEstim) * 100) : 0, objectifPct: Math.round((1 / 1.5) * 100), isLowerBetter: true, status: "stable" },
    { num: 4, label: "Estim. → Mandat", from: "estimations", to: "mandat", realise: safeDiv(estimations, mandats), objectif: obj.mandats > 0 ? 2 : 2, realisePct: mandats > 0 ? Math.round((mandats / estimations) * 100) : 0, objectifPct: 50, isLowerBetter: true, status: "stable" },
    { num: 5, label: "% Exclusivité", from: "mandats", to: "exclusifs", realise: pctExclu, objectif: obj.exclusivite, realisePct: pctExclu, objectifPct: obj.exclusivite, isLowerBetter: false, status: "stable" },
    { num: 7, label: "Visites → Offre", from: "visites", to: "offre", realise: safeDiv(visites, offres), objectif: 10, realisePct: offres > 0 ? Math.round((offres / visites) * 100) : 0, objectifPct: 10, isLowerBetter: true, status: "stable" },
    { num: 8, label: "Offres → Compromis", from: "offres", to: "compromis", realise: safeDiv(offres, compromis), objectif: 2, realisePct: compromis > 0 ? Math.round((compromis / offres) * 100) : 0, objectifPct: 50, isLowerBetter: true, status: "stable" },
    { num: 9, label: "Compromis → Acte", from: "compromis", to: "acte", realise: safeDiv(compromis, actes), objectif: 1.5, realisePct: actes > 0 ? Math.round((actes / compromis) * 100) : 0, objectifPct: 67, isLowerBetter: true, status: "stable" },
    { num: 12, label: "CA par Acte", from: "CA", to: "acte", realise: caParActe, objectif: obj.ca > 0 ? Math.round(obj.ca / Math.max(1, obj.actes)) : 10000, realisePct: 0, objectifPct: 0, isLowerBetter: false, status: "stable" },
  ].map((r) => ({ ...r, status: getStatus(r.realise, r.objectif, r.isLowerBetter) }));

  const showVolumes = viewMode === "volumes" || viewMode === "both";
  const showRatios = viewMode === "ratios" || viewMode === "both";

  const surperfCount = ratios.filter((r) => r.status === "surperf").length;
  const stableCount = ratios.filter((r) => r.status === "stable").length;
  const sousperfCount = ratios.filter((r) => r.status === "sousperf").length;

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(["volumes", "ratios", "both"] as ViewMode[]).map((m) => (
            <button key={m} type="button" onClick={() => setViewMode(m)}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {m === "volumes" ? "Volumes" : m === "ratios" ? "Ratios" : "Les deux"}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {scope !== "individual" && <>{headcount} collaborateur{headcount > 1 ? "s" : ""} · </>}
          {objectifSource === "gps" ? "Objectifs GPS" : `Objectifs ${CATEGORY_LABELS[category]}`}
        </span>
      </div>

      {/* Chain cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {volumes.map((vol) => {
          const ratio = ratios.find((r) => r.num === vol.num);
          const volStatus = vol.unit === "%" ? getStatus(vol.realise, vol.objectif, false) : getVolumeStatus(vol.realise, vol.objectif);
          const sc = STATUS_CONFIG[volStatus];

          // Skip volume-only cards in ratios mode (except 1, 6)
          if (viewMode === "ratios" && !ratio && vol.num !== 1 && vol.num !== 6) return null;

          return (
            <div key={vol.num} className={cn("rounded-xl p-3 space-y-2 border border-border", sc.bg)} style={{ borderTop: `3px solid ${sc.borderColor}` }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground">{String(vol.num).padStart(2, "0")}</span>
                <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold", sc.text, sc.bg)}>
                  {sc.label}
                </span>
              </div>
              <p className="text-xs font-medium text-foreground">{vol.label}</p>

              {/* Volume data */}
              {showVolumes && (
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-foreground">{formatVal(vol.realise, vol.unit)}</span>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground">obj. {formatVal(vol.objectif, vol.unit)}</span>
                    <p className={cn("text-xs font-semibold", sc.text)}>
                      {vol.realise - vol.objectif >= 0 ? "+" : ""}{formatVal(vol.realise - vol.objectif, vol.unit)} {sc.arrow}
                    </p>
                  </div>
                </div>
              )}

              {/* Ratio data */}
              {showRatios && ratio && (
                <div className="border-t border-border/50 pt-2 space-y-1">
                  <p className="text-[10px] text-foreground">
                    <span className="font-semibold">{ratio.realise}</span> {ratio.from} → 1 {ratio.to}
                    {ratio.realisePct > 0 && <span className="text-muted-foreground"> · {ratio.realisePct}%</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Obj. {objectifSource === "gps" ? "GPS" : CATEGORY_LABELS[category]} : {ratio.objectif} → 1
                    {ratio.objectifPct > 0 && <span> · {ratio.objectifPct}%</span>}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {showRatios && (
        <div className="flex items-center justify-center gap-4 text-xs">
          <span className="flex items-center gap-1 text-green-500 font-medium">Surperf : {surperfCount}</span>
          <span className="flex items-center gap-1 text-amber-500 font-medium">Stable : {stableCount}</span>
          <span className="flex items-center gap-1 text-red-500 font-medium">Sous-perf : {sousperfCount}</span>
        </div>
      )}
    </div>
  );
}
