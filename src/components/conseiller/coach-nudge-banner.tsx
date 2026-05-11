"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  X,
  ArrowRight,
  Bell,
  Loader2,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { useRatios } from "@/hooks/use-ratios";
import type { Plan30jPayload } from "@/config/coaching";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

interface NudgeOutput {
  trigger:
    | "NO_RECENT_SAISIE"
    | "RATIO_DEGRADING"
    | "PLAN_BEHIND"
    | "PLAN_JUST_EXPIRED";
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}

const DISMISS_STORAGE_KEY = "nxt-nudge-dismissed-v1";

function getDismissedTriggers(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<{
      trigger: string;
      dismissedAt: number;
    }>;
    // Auto-expire après 24h pour permettre re-affichage du même trigger plus tard.
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return parsed.filter((d) => d.dismissedAt > cutoff).map((d) => d.trigger);
  } catch {
    return [];
  }
}

function rememberDismissed(trigger: string) {
  if (typeof window === "undefined") return;
  try {
    const existing = localStorage.getItem(DISMISS_STORAGE_KEY);
    const arr = existing
      ? (JSON.parse(existing) as Array<{ trigger: string; dismissedAt: number }>)
      : [];
    const filtered = arr.filter((d) => d.trigger !== trigger);
    filtered.push({ trigger, dismissedAt: Date.now() });
    localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    /* ignore */
  }
}

/**
 * CoachNudgeBanner — sous-PR Coach-6.1.
 *
 * Banner contextuel en haut de page. Détecte 1 nudge proactif (sans saisie,
 * plan en retard, ratio dégradé, plan expiré) et l'affiche via RAG. Dismissible
 * avec persistance localStorage 24h par trigger.
 *
 * UX : non bloquant, top de page, ton Tedesco bienveillant.
 */
export function CoachNudgeBanner() {
  const allResults = useAppStore((s) => s.results);
  const user = useAppStore((s) => s.user);
  const { getActivePlan, archivedPlans } = useImprovementResources();
  const { computedRatios } = useRatios();

  const [nudge, setNudge] = useState<NudgeOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Build context envoyé au RAG
  const nudgeContext = useMemo(() => {
    if (!user) return null;
    const userResults = allResults
      .filter((r) => r.userId === user.id)
      .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));

    const lastSaisieIso = userResults[0]?.periodEnd ?? null;

    const topPainRatio = computedRatios
      .filter((r) => r.status === "danger" || r.status === "warning")
      .sort((a, b) => (a.percentageOfTarget ?? 100) - (b.percentageOfTarget ?? 100))[0];
    const topPainExpertiseId =
      (topPainRatio?.ratioId as ExpertiseRatioId | undefined) ?? null;

    const activePlan = getActivePlan();
    const activePlanInfo = activePlan
      ? (() => {
          const payload = activePlan.payload as unknown as Plan30jPayload;
          const allActions = (payload.weeks ?? []).flatMap(
            (w) => w.actions ?? [],
          );
          const daysSinceStart = Math.floor(
            (Date.now() - new Date(activePlan.created_at).getTime()) /
              (1000 * 60 * 60 * 24),
          );
          return {
            expertiseId: (payload.pain_ratio_id ?? "") as ExpertiseRatioId,
            daysSinceStart,
            actionsDone: allActions.filter(
              (a) => a.done === true || a.status === "done",
            ).length,
            actionsTotal: allActions.length,
          };
        })()
      : null;

    const recentExpired = (archivedPlans ?? [])
      .filter((p) => p.archived_at)
      .sort(
        (a, b) =>
          new Date(b.archived_at!).getTime() -
          new Date(a.archived_at!).getTime(),
      )[0];
    const recentExpiredPlan = recentExpired
      ? {
          expertiseId: (recentExpired.pain_ratio_id ?? "") as ExpertiseRatioId,
          daysSinceExpiry: Math.floor(
            (Date.now() - new Date(recentExpired.archived_at!).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        }
      : null;

    return {
      lastSaisieIso,
      topPainExpertiseId,
      ratioWeekOverWeekDelta: null, // V1 : pas de calcul WoW pour l'instant
      activePlan: activePlanInfo,
      recentExpiredPlan,
    };
  }, [user, allResults, computedRatios, getActivePlan, archivedPlans]);

  // Init dismiss state
  useEffect(() => {
    setDismissed(getDismissedTriggers());
  }, []);

  // Fetch nudge au mount + quand context change
  useEffect(() => {
    if (!nudgeContext) {
      setNudge(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNudge(null);
    fetch("/api/coach-nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nudgeContext),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { nudge: NudgeOutput | null };
        if (!cancelled) setNudge(data.nudge);
      })
      .catch((err) => {
        console.error("[coach-nudge-banner] fetch failed", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nudgeContext]);

  const handleDismiss = () => {
    if (!nudge) return;
    rememberDismissed(nudge.trigger);
    setDismissed((prev) => [...prev, nudge.trigger]);
    setNudge(null);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-indigo-200/40 bg-indigo-50/30 px-3 py-2 text-xs text-indigo-700 dark:border-indigo-900/30 dark:bg-indigo-950/20 dark:text-indigo-300">
        <Loader2 className="h-3 w-3 animate-spin" />
        Coach NXT analyse ta situation...
      </div>
    );
  }

  if (!nudge || dismissed.includes(nudge.trigger)) return null;

  return (
    <section
      role="status"
      aria-label={`Notification du Coach NXT : ${nudge.title}`}
      className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-indigo-50/30 p-4 dark:border-indigo-900/40 dark:from-indigo-950/30 dark:to-indigo-950/10"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <Bell className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              Coach NXT
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {nudge.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {nudge.body}
          </p>
          <Link
            href={nudge.ctaHref}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            {nudge.ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Masquer cette notification"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
