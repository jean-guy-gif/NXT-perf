"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { useAllResults } from "@/hooks/use-results";
import { useDiagnosticResults } from "@/hooks/use-diagnostic-results";
import { useRatios } from "@/hooks/use-ratios";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { useUserContext } from "@/hooks/use-user-context";
import { useAppStore } from "@/stores/app-store";
import { buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import {
  deriveProfileLevel,
  getAvgCommissionEur,
} from "@/lib/get-avg-commission";
import {
  findCriticitePointsWithContext,
  type CriticitePoint,
} from "@/lib/diagnostic-criticite";
import { detectTopPainPoints } from "@/lib/pain-point-detector";
import { getProRationFactor } from "@/lib/performance/pro-rated-objective";
import { DiagnosticVerdictCard } from "@/components/conseiller/diagnostic/diagnostic-verdict-card";
import { WhyDangerDrawer } from "@/components/conseiller/diagnostic/why-danger-drawer";
import { ActivePlanCard } from "@/components/conseiller/diagnostic/active-plan-card";
import { KeyFiguresAccordion } from "@/components/conseiller/diagnostic/key-figures-accordion";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import { useMemo } from "react";

// ─── Formatage de la phrase « gain en ventes » ──────────────────────────────

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

/** Seuil formaté selon le ratio (% pour l'exclusivité, sinon nombre). */
function formatSeuil(expertiseId: string, target: number): string {
  if (expertiseId === "pct_exclusivite") return `${Math.round(target)} %`;
  return formatNumber(target);
}

export function DiagnosticVerdictView() {
  const router = useRouter();
  const { user, category } = useUser();
  const { computedRatios } = useRatios();
  // Diagnostic sur l'agrégat 3 mois glissants (6 mois pour compromis/actes).
  const { results3m: results, results6m } = useDiagnosticResults();
  const allResults = useAllResults();
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const { createPlan30j } = useImprovementResources();

  const userCtx = useUserContext();
  const [drawerMode, setDrawerMode] = useState<"single" | "list" | null>(null);
  const [improving, setImproving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const criticite = useMemo(() => {
    if (!user || !results || computedRatios.length === 0)
      return { top: null, others: [], override: null, originalTopId: null };
    const measured = buildMeasuredRatios(computedRatios, results, results6m);
    const today = new Date();
    const effectiveMonths = getProRationFactor(today);
    // Sous-PR Coach-10 : helper unifié findCriticitePointsWithContext qui
    // applique automatiquement l'override contextuel downstream (Coach-8).
    return findCriticitePointsWithContext(
      measured,
      userCtx,
      results,
      category,
      effectiveMonths,
    );
  }, [user, results, results6m, computedRatios, category, userCtx]);

  // Top 3 des points de douleur (gain en ventes), avec gain € sur 3 mois.
  const topPainPoints = useMemo(() => {
    if (!user || !results || computedRatios.length === 0) return [];
    const measured = buildMeasuredRatios(computedRatios, results, results6m);
    return detectTopPainPoints(measured, userCtx, 3);
  }, [user, results, results6m, computedRatios, userCtx]);

  const handleSavoirPourquoi = () => {
    setDrawerMode("single");
  };

  const handleAmeliorer = async (point: CriticitePoint) => {
    if (!user || !results) return;
    setImproving(true);
    setToast(null);
    try {
      if (point.type === "ratio") {
        const measured = buildMeasuredRatios(computedRatios, results, results6m);
        const profile = deriveProfileLevel(category);
        const myHistory = allResults.filter((r) => r.userId === user.id);
        const avg = getAvgCommissionEur(
          agencyObjective?.avgActValue,
          myHistory
        );
        await createPlan30j({
          mode: "targeted",
          ratioId: point.id as ExpertiseRatioId,
          measuredRatios: measured,
          profile,
          avgCommissionEur: avg,
          // Chantier A.3 — propage les axes contextuels depuis useUserContext
          // pour que `resolveThreshold` côté hook calcule le bon seuil cible.
          agentStatus: userCtx.agentStatus,
          teamSize: userCtx.teamSize,
        });
      }
      // Pour un volume : on redirige sans plan ciblé — la page M'améliorer
      // dérivera elle-même le levier recommandé (volumeToRelatedRatio).
      router.push("/conseiller/ameliorer");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("PLAN_ACTIVE_ALREADY")) {
        setToast(
          "Un plan est déjà actif — redirection vers votre plan en cours."
        );
        router.push("/conseiller/ameliorer");
      } else {
        setToast("Erreur lors de la création du plan.");
      }
    } finally {
      setImproving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4">
      {/* PR3.7 Q7=A : carte détaillée du plan en cours, AVANT le verdict.
          Le PersistentPlanBanner du layout reste visible en parallèle. */}
      <ActivePlanCard />

      {criticite.top ? (
        <DiagnosticVerdictCard
          verdictPoint={criticite.top}
          onSavoirPourquoi={handleSavoirPourquoi}
          onAmeliorer={() => handleAmeliorer(criticite.top!)}
          onSeeOthersClick={() => setDrawerMode("list")}
          improving={improving}
        />
      ) : (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Aucun point critique détecté ce mois-ci
          </p>
          <p className="mt-2 text-sm text-foreground">
            Vos volumes et ratios sont conformes aux objectifs de votre profil.
            Continuez votre saisie hebdomadaire pour suivre votre progression.
          </p>
        </div>
      )}

      {topPainPoints.length > 0 && (
        <section
          aria-label="Top 3 des points de douleur"
          className="rounded-2xl border border-border bg-card p-5"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Top 3 des points de douleur
          </h2>
          <ul className="mt-3 space-y-3">
            {topPainPoints.map((pp, i) => (
              <li
                key={pp.expertiseId}
                className="flex gap-3 rounded-xl border border-border bg-background p-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {pp.expertise.label}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Si tu passes ce ratio à{" "}
                    <span className="font-semibold text-foreground">
                      {formatSeuil(pp.expertiseId, pp.targetValue)}
                    </span>
                    , c&apos;est environ{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-500">
                      +{formatNumber(pp.painScoreV2)} ventes
                    </span>
                    , soit{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-500">
                      +{formatEuro(pp.estimatedCaLossEur)} €
                    </span>{" "}
                    sur 3 mois.
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {toast && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm text-orange-600">
          {toast}
        </div>
      )}

      {/* PR3.7 Q1=C : accordéon replié par défaut, déplie toggles V/R, période,
          KPI cards colorées, flux de production et mini-DPI. */}
      <KeyFiguresAccordion />

      <WhyDangerDrawer
        open={drawerMode !== null}
        onClose={() => setDrawerMode(null)}
        mode={drawerMode ?? "list"}
        verdict={drawerMode === "single" ? criticite.top : null}
        otherPainPoints={drawerMode === "list" ? criticite.others : []}
        override={criticite.override}
        originalExpertiseId={criticite.originalTopId}
      />
    </div>
  );
}
