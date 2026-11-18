"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Crosshair,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PeriodResults } from "@/types/results";
import type { RatioConfig, RatioId } from "@/types/ratios";
import type { UserCategory } from "@/types/user";
import {
  computeMonthProgress,
  type MonthProgress,
  type MonthVolumeItem,
} from "@/lib/coaching-debrief";
import { computeAllRatios } from "@/lib/ratios";
import { buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import { detectBiggestPainPoint } from "@/lib/pain-point-detector";
import { formatCible } from "@/lib/plan-30-jours";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import { aggregateCurrentMonth } from "@/lib/aggregate-results";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import { useDiagnosticResults } from "@/hooks/use-diagnostic-results";
import { useUserContext } from "@/hooks/use-user-context";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import type { Plan30jPayload } from "@/config/coaching";

// ── Props ────────────────────────────────────────────────────────────────────

interface CoachingDebriefScreenProps {
  results: PeriodResults;
  category: UserCategory;
  ratioConfigs: Record<RatioId, RatioConfig>;
  persona?: string;
  onClose: () => void;
}

// ── Formatage (aligné sur le tableau de bord) ────────────────────────────────

/** Entier avec séparateur de milliers (espace), ex. 14400 → "14 400". */
function formatEuro(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Nombre à 1 décimale, virgule française (ex. 1.8 → "1,8", 15 → "15"). */
function formatNumber(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return String(rounded).replace(".", ",");
}

/** Cible formatée (arrondi d'affichage unifié via formatCible). */
function formatSeuil(expertiseId: ExpertiseRatioId, target: number): string {
  return formatCible(target, expertiseId);
}

// ── Composant ────────────────────────────────────────────────────────────────

export function CoachingDebriefScreen({
  results,
  category,
  ratioConfigs,
  onClose,
}: CoachingDebriefScreenProps) {
  const user = useAppStore((s) => s.user);
  const conseillerObjective = useAppStore((s) => s.conseillerObjective);
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const allResults = useAllResults();
  const { results3m, results6m } = useDiagnosticResults();
  const userCtx = useUserContext();
  const { getActivePlan, updateResource } = useImprovementResources();

  // Date figée au montage — un seul « maintenant » pour tout l'écran.
  const now = useMemo(() => new Date(), []);
  const objective = conseillerObjective ?? agencyObjective;

  // ── Bloc 1 : mois en cours (réalisé depuis le 1er vs objectif proraté) ──
  const monthProgress: MonthProgress = useMemo(() => {
    const month = aggregateCurrentMonth(allResults, user?.id, now) ?? results;
    return computeMonthProgress(month, category, objective, ratioConfigs, now);
  }, [allResults, user?.id, now, results, category, objective, ratioConfigs]);

  // ── Bloc 3 : point de douleur n°1 (identique au tableau de bord) ──
  const painPoint = useMemo(() => {
    if (!results3m) return null;
    const computed = computeAllRatios(results3m, category, ratioConfigs);
    const measured = buildMeasuredRatios(computed, results3m, results6m);
    return detectBiggestPainPoint(measured, userCtx);
  }, [results3m, results6m, category, ratioConfigs, userCtx]);

  // ── Bloc 4 : plan 30 jours actif + semaine courante ──
  const activePlan = getActivePlan();
  const [localPayload, setLocalPayload] = useState<Plan30jPayload | null>(null);
  useEffect(() => {
    setLocalPayload(
      activePlan
        ? (structuredClone(activePlan.payload) as unknown as Plan30jPayload)
        : null,
    );
  }, [activePlan?.id, activePlan?.updated_at]);

  const currentWeekNumber = useMemo(() => {
    if (!activePlan) return 1;
    const created = new Date(activePlan.created_at).getTime();
    const days = Math.max(0, (now.getTime() - created) / (1000 * 60 * 60 * 24));
    return Math.min(4, Math.max(1, Math.ceil((days + 1) / 7)));
  }, [activePlan?.created_at, now]);

  const setActionDone = async (weekNumber: number, actionId: string, done: boolean) => {
    if (!localPayload || !activePlan) return;
    const next: Plan30jPayload = {
      ...localPayload,
      weeks: localPayload.weeks.map((w) =>
        w.week_number === weekNumber
          ? {
              ...w,
              actions: w.actions.map((a) =>
                a.id === actionId ? { ...a, done, status: done ? "done" : "todo" } : a,
              ),
            }
          : w,
      ),
    };
    setLocalPayload(next);
    await updateResource(activePlan.id, {
      payload: next as unknown as Record<string, unknown>,
    });
  };

  const byKey = (key: MonthVolumeItem["key"]) =>
    monthProgress.items.find((i) => i.key === key)!;

  // Chiffres bruts de la semaine saisie (affichés en petit).
  const week = results;
  const weekRaw = [
    { label: "Contacts", value: week.prospection.contactsTotaux },
    { label: "Estimations", value: week.vendeurs.estimationsRealisees },
    { label: "Mandats", value: week.vendeurs.mandatsSignes },
    { label: "Visites", value: week.acheteurs.nombreVisites },
    { label: "Offres", value: week.acheteurs.offresRecues },
    { label: "Compromis", value: week.acheteurs.compromisSignes },
  ];

  const prevWeek = currentWeekNumber > 1
    ? localPayload?.weeks.find((w) => w.week_number === currentWeekNumber - 1)
    : undefined;
  const curWeek = localPayload?.weeks.find((w) => w.week_number === currentWeekNumber);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background overflow-y-auto">
      <div className="mx-auto w-full max-w-lg px-5 py-6 space-y-6">
        <div className="text-center space-y-1">
          <p className="text-3xl">📊</p>
          <h1 className="text-xl font-bold text-foreground">Ton débrief</h1>
          <p className="text-sm text-muted-foreground">
            Saisie enregistrée. Voici où tu en es ce mois-ci.
          </p>
        </div>

        {/* ── Bloc 1 — Ton mois en cours ──────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
              <CalendarDays className="h-4 w-4" /> Ton mois en cours
            </h2>
            <span className="text-[11px] text-muted-foreground">
              jour {monthProgress.daysElapsed} / {monthProgress.daysInMonth}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Réalisé depuis le 1er du mois, face à ton objectif mensuel au prorata des
            jours écoulés.
          </p>

          <div className="space-y-1.5">
            <MonthRow item={byKey("contacts")} />
            <MonthRow item={byKey("estimations")} />
            <MonthRow item={byKey("mandats")} sub={byKey("exclusifs")} />
            <MonthRow item={byKey("visites")} />
            <MonthRow item={byKey("offres")} />
            <MonthRow item={byKey("compromis")} />
          </div>

          {monthProgress.usingFallback && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Repères au standard Start Academia niveau {monthProgress.fallbackLevelLabel}.{" "}
              <Link href="/conseiller/diagnostic#objectifs" className="text-primary underline">
                Fixer mes objectifs
              </Link>
            </p>
          )}

          <details className="text-[11px] text-muted-foreground">
            <summary className="cursor-pointer select-none">
              Voir les chiffres de la semaine saisie
            </summary>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {weekRaw.map((r) => (
                <div key={r.label} className="rounded-md border border-border bg-card px-2 py-1.5 text-center">
                  <p className="text-sm font-semibold text-foreground">{r.value}</p>
                  <p className="text-[10px] text-muted-foreground">{r.label}</p>
                </div>
              ))}
            </div>
          </details>
        </section>

        {/* ── Bloc 2 — Verdict honnête ────────────────────────────────── */}
        <section
          className={cn(
            "rounded-xl border p-4",
            monthProgress.onTrack
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-amber-500/30 bg-amber-500/5",
          )}
        >
          <p className="flex items-start gap-2 text-sm font-medium text-foreground">
            {monthProgress.onTrack ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            )}
            {monthProgress.verdict}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Tes ratios se lisent sur 3 mois →{" "}
            <Link href="/conseiller/diagnostic" className="text-primary underline">
              voir ton tableau de bord
            </Link>
          </p>
        </section>

        {/* ── Bloc 3 — Point de douleur n°1 ───────────────────────────── */}
        {painPoint && (
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
              <Crosshair className="h-4 w-4" /> Ton point de douleur n° 1
            </h2>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-base font-bold text-foreground">
                {painPoint.expertise.label}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Si tu passes ce ratio à{" "}
                <span className="font-semibold text-foreground">
                  {formatSeuil(painPoint.expertiseId, painPoint.targetValue)}
                </span>
                , c&apos;est environ{" "}
                <span className="font-semibold text-emerald-600 dark:text-emerald-500">
                  +{formatNumber(painPoint.painScoreV2)} ventes
                </span>
                , soit{" "}
                <span className="font-semibold text-emerald-600 dark:text-emerald-500">
                  +{formatEuro(painPoint.estimatedCaLossEur)} €
                </span>{" "}
                sur 3 mois.
              </p>
            </div>
          </section>
        )}

        {/* ── Bloc 4 — Ton plan cette semaine ─────────────────────────── */}
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
            <Target className="h-4 w-4" /> Ton plan cette semaine
          </h2>

          {localPayload && curWeek ? (
            <div className="space-y-3">
              {prevWeek && prevWeek.actions.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    Semaine {prevWeek.week_number} — tu as fait quoi ?
                  </p>
                  <div className="space-y-2">
                    {prevWeek.actions.map((a) => {
                      const done = a.status === "done" || a.done;
                      return (
                        <div key={a.id} className="flex items-start justify-between gap-2">
                          <p className="text-sm text-foreground">{a.label}</p>
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => setActionDone(prevWeek.week_number, a.id, true)}
                              className={cn(
                                "rounded-md px-2 py-1 text-[11px] font-semibold transition-colors",
                                done
                                  ? "bg-emerald-500 text-white"
                                  : "border border-border text-muted-foreground hover:bg-muted",
                              )}
                            >
                              Fait
                            </button>
                            <button
                              type="button"
                              onClick={() => setActionDone(prevWeek.week_number, a.id, false)}
                              className={cn(
                                "rounded-md px-2 py-1 text-[11px] font-semibold transition-colors",
                                !done
                                  ? "bg-muted-foreground/20 text-foreground"
                                  : "border border-border text-muted-foreground hover:bg-muted",
                              )}
                            >
                              Pas fait
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="mb-2 text-xs font-semibold text-primary">
                  Semaine {curWeek.week_number} — {curWeek.focus}
                </p>
                {curWeek.exercice && (
                  <p className="mb-2 rounded-md bg-card px-3 py-2 text-sm font-medium text-foreground">
                    <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Geste de la semaine
                    </span>
                    <br />
                    {curWeek.exercice}
                  </p>
                )}
                <ul className="space-y-1.5">
                  {curWeek.actions.map((a) => (
                    <li key={a.id} className="flex items-start gap-2 text-sm text-foreground">
                      {a.status === "done" || a.done ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      {a.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <Link
              href="/conseiller/ameliorer"
              className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              Créer mon plan d&apos;action
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </section>

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Retour au dashboard
        </button>

        <div className="h-4" />
      </div>
    </div>
  );
}

// ── Ligne « mois en cours » ──────────────────────────────────────────────────

function MonthRow({ item, sub }: { item: MonthVolumeItem; sub?: MonthVolumeItem }) {
  const behind = item.rawTarget > 0 && item.pct < 0.9;
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-3 py-2",
        behind ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card",
      )}
    >
      <div>
        <p className="text-sm font-medium text-foreground">{item.label}</p>
        {sub && (
          <p className="text-[11px] text-muted-foreground">
            dont {sub.actual} / {sub.target} exclusifs
          </p>
        )}
      </div>
      <p className={cn("text-sm font-semibold", behind ? "text-amber-500" : "text-foreground")}>
        {item.actual} <span className="text-muted-foreground">/ {item.target}</span>
      </p>
    </div>
  );
}
