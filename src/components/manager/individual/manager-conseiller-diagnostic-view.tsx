"use client";

import { useMemo, useState } from "react";
import { MessageCircleHeart, Sparkles, X } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useResults, useAllResults } from "@/hooks/use-results";
import { useRatios } from "@/hooks/use-ratios";
import { useUserContext } from "@/hooks/use-user-context";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import { findCriticitePoints } from "@/lib/diagnostic-criticite";
import { getProRationFactor } from "@/lib/performance/pro-rated-objective";
import {
  diagnoseAdvisor,
  type AdvisorDiagnosis,
} from "@/lib/coaching/advisor-diagnosis";
import { CATEGORY_LABELS } from "@/lib/constants";
import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";
import { PLAN_30J_DURATION_DAYS, type Plan30jPayload } from "@/config/coaching";
import type { CoachingMetrics } from "@/lib/coaching/individual-coaching-kit";
import { DiagnosticVerdictCard } from "@/components/conseiller/diagnostic/diagnostic-verdict-card";
import { WhyDangerDrawer } from "@/components/conseiller/diagnostic/why-danger-drawer";
import { KeyFiguresAccordion } from "@/components/conseiller/diagnostic/key-figures-accordion";
import { AdvisorActivePlanReadOnly } from "@/components/manager/individual/advisor-active-plan-readonly";
import { IndividualDiagnosticCard } from "@/components/manager/individual/individual-diagnostic-card";
import { IndividualCoachingPrep } from "@/components/manager/individual/individual-coaching-prep";

interface Props {
  /**
   * Nom complet du conseiller observé. Utilisé pour les libellés humanisés
   * (ex. "Plan de Jean-Marc en cours"). Le prénom est dérivé via split.
   */
  advisorDisplayName: string;
}

/**
 * ManagerConseillerDiagnosticView (Chantier C — Q2 mirror β).
 *
 * Mirror Manager-side de `DiagnosticVerdictView` (côté Conseiller). Source de
 * vérité unique : tous les hooks "current user" (useUser, useResults,
 * useImprovementResources) sont déjà override-aware via PR3.8.5
 * (AdvisorOverrideProvider). Aucune nouvelle lib `getConseillerDiagnostic`
 * n'a été créée — l'override existant fait le job.
 *
 * Différences avec la vue Conseiller :
 *   - CTA principal "Préparer un coaching avec {prénom}" en tête (Q4 — drawer
 *     placeholder pour le contenu détaillé livré en Chantier D).
 *   - Bouton "M'améliorer" RETIRÉ (Q5 read-only strict — manager ne crée pas
 *     un plan à la place du conseiller).
 *   - Plan actif rendu via `AdvisorActivePlanReadOnly` (breakdown faites/
 *     non faites, sans CTA "Reprendre").
 *   - Libellés humanisés "de {prénom}" (Q3) propagés via prop `displayName`
 *     dans `KeyFiguresAccordion` + `MiniDpiGauge`.
 *
 * Composants Conseiller réutilisés tels quels :
 *   - `DiagnosticVerdictCard` (sans `onAmeliorer` → bouton masqué)
 *   - `WhyDangerDrawer` (purement consultatif)
 */
export function ManagerConseillerDiagnosticView({ advisorDisplayName }: Props) {
  const { user, category } = useUser();
  const { computedRatios } = useRatios();
  const results = useResults();
  const allResults = useAllResults();
  const { getActivePlan, loading: plansLoading } = useImprovementResources();

  const [drawerMode, setDrawerMode] = useState<"single" | "list" | null>(null);
  const [coachingPrepOpen, setCoachingPrepOpen] = useState(false);

  // Prénom dérivé pour les libellés courts ("de Jean-Marc"). On garde le nom
  // complet (`advisorDisplayName`) pour l'aria-label du drawer coaching.
  const firstName = useMemo(
    () => advisorDisplayName.split(" ")[0] || advisorDisplayName,
    [advisorDisplayName],
  );
  const lastName = useMemo(() => {
    const parts = advisorDisplayName.split(" ");
    return parts.slice(1).join(" ");
  }, [advisorDisplayName]);

  // Chantier A.3 — useUserContext est override-aware (chantier C). Sous
  // ConseillerProxy, retourne le contexte du conseiller observé (seniority,
  // agentStatus, teamSizeBucket, avgCommissionEur).
  const userCtx = useUserContext();

  const criticite = useMemo(() => {
    if (!user || !results || computedRatios.length === 0)
      return { top: null, others: [] };
    const measured = buildMeasuredRatios(computedRatios, results);
    const today = new Date();
    const effectiveMonths = getProRationFactor(today);
    return findCriticitePoints(
      measured,
      userCtx,
      results,
      category,
      effectiveMonths,
    );
  }, [user, results, computedRatios, category, userCtx]);

  // Chantier D — Inputs de la prep coaching. Dupliqués depuis
  // `manager-individual-ameliorer-view.tsx` (Option 1 inline V1, refacto en
  // hook partagé `useManagerCoachingInputs` envisageable plus tard).

  // Période N-1 du conseiller observé pour les évolutions (ca/mandats/etc.)
  const previousResults = useMemo(() => {
    if (!user) return null;
    const mine = allResults.filter((r) => r.userId === user.id);
    if (mine.length < 2) return null;
    const sorted = [...mine].sort((a, b) =>
      b.periodStart.localeCompare(a.periodStart),
    );
    return sorted[1] ?? null;
  }, [allResults, user]);

  // Diagnostic chiffres réels (rules-based) — alimente IndividualDiagnosticCard
  // et enrichit les recaps email/whatsapp dans IndividualCoachingLive.
  const diagnosis: AdvisorDiagnosis = useMemo(
    () =>
      diagnoseAdvisor({
        current: results,
        previous: previousResults,
        category,
      }),
    [results, previousResults, category],
  );

  // Snapshot du plan actif observé — alimente coachingMetrics si plan en cours.
  const planSummary = useMemo(() => {
    const activePlan = plansLoading ? null : getActivePlan();
    if (!activePlan) return null;
    const payload = activePlan.payload as unknown as Plan30jPayload;
    const allActions = (payload.weeks ?? []).flatMap((w) => w.actions ?? []);
    const total = allActions.length;
    const done = allActions.filter((a) => a.done).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const remaining = Math.max(0, total - done);
    const startedAt = new Date(activePlan.created_at);
    const elapsedDays = Math.max(
      1,
      Math.min(
        PLAN_30J_DURATION_DAYS,
        Math.ceil((Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24)),
      ),
    );
    const ratioId = payload.pain_ratio_id as ExpertiseRatioId | undefined;
    return {
      ratioId: ratioId ?? null,
      total,
      done,
      remaining,
      pct,
      elapsedDays,
      totalDays: PLAN_30J_DURATION_DAYS,
    };
  }, [plansLoading, getActivePlan]);

  // Cascade de fallback du levier en focus pour le coaching :
  //   1. douleur prioritaire rules-based (data-driven, plus actionnable)
  //   2. plan actif du conseiller (continuité)
  //   3. top criticité ratio (gainEur-driven via findCriticitePoints A.3)
  //   4. null (cadrage générique du coach-brain)
  const coachingExpertiseId: ExpertiseRatioId | null = useMemo(() => {
    if (diagnosis.primary?.expertiseId) return diagnosis.primary.expertiseId;
    if (planSummary?.ratioId) return planSummary.ratioId;
    if (criticite.top && criticite.top.type === "ratio") {
      const id = criticite.top.id;
      if (id in RATIO_EXPERTISE) return id as ExpertiseRatioId;
    }
    return null;
  }, [diagnosis, planSummary, criticite.top]);

  const coachingMetrics: CoachingMetrics | undefined = planSummary
    ? {
        dayOfPlan: planSummary.elapsedDays,
        totalDays: planSummary.totalDays,
        donePct: planSummary.pct,
        doneActions: planSummary.done,
        totalActions: planSummary.total,
        remainingActions: planSummary.remaining,
      }
    : undefined;

  const advisor = useMemo(
    () => ({
      firstName,
      lastName,
      level: CATEGORY_LABELS[category] ?? category,
      email: user?.email ?? "",
    }),
    [firstName, lastName, category, user?.email],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4">
      {/* CTA principal Manager — Préparer un coaching */}
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <MessageCircleHeart className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Action manager
            </p>
            <h3 className="mt-0.5 text-base font-bold text-foreground">
              Préparer un coaching individuel
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Outil d&apos;aide à l&apos;entretien — synthèse, points
              d&apos;attention, axes de discussion.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCoachingPrepOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Sparkles className="h-4 w-4" />
          Préparer un coaching avec {firstName}
        </button>
      </div>

      {/* Plan actif read-only avec breakdown */}
      <AdvisorActivePlanReadOnly displayName={firstName} />

      {/* Verdict — composant Conseiller réutilisé. Pas de `onAmeliorer` →
          bouton "M'améliorer" masqué (read-only manager). */}
      {criticite.top ? (
        <DiagnosticVerdictCard
          verdictPoint={criticite.top}
          onSavoirPourquoi={() => setDrawerMode("single")}
          onSeeOthersClick={() => setDrawerMode("list")}
        />
      ) : (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Aucun point critique détecté ce mois-ci
          </p>
          <p className="mt-2 text-sm text-foreground">
            Les volumes et ratios de {firstName} sont conformes aux objectifs
            de son profil. Continuez à suivre sa saisie hebdomadaire.
          </p>
        </div>
      )}

      {/* Chiffres clés — accordéon Conseiller réutilisé avec libellés
          humanisés "de {prénom}" via la prop displayName. */}
      <KeyFiguresAccordion displayName={firstName} />

      <WhyDangerDrawer
        open={drawerMode !== null}
        onClose={() => setDrawerMode(null)}
        mode={drawerMode ?? "list"}
        verdict={drawerMode === "single" ? criticite.top : null}
        otherPainPoints={drawerMode === "list" ? criticite.others : []}
      />

      <CoachingPrepDrawer
        open={coachingPrepOpen}
        onClose={() => setCoachingPrepOpen(false)}
        advisorName={advisorDisplayName}
        advisorFirstName={firstName}
        advisor={advisor}
        expertiseId={coachingExpertiseId}
        metrics={coachingMetrics}
        diagnosis={diagnosis}
      />
    </div>
  );
}

// ─── Drawer Coaching Prep (Chantier D — rebranchement) ───────────────────

interface CoachingPrepDrawerProps {
  open: boolean;
  onClose: () => void;
  advisorName: string;
  advisorFirstName: string;
  advisor: {
    firstName: string;
    lastName: string;
    level: string;
    email: string;
  };
  expertiseId: ExpertiseRatioId | null;
  metrics: CoachingMetrics | undefined;
  diagnosis: AdvisorDiagnosis;
}

/**
 * CoachingPrepDrawer — Chantier D.
 *
 * Drawer latéral qui héberge la prep coaching contextualisée. Réutilise
 * 1:1 les briques déjà livrées dans `manager-individual-ameliorer-view`
 * (chantier paralèle "feat(manager/coaching) rules-based + email/whatsapp"
 * + "feat(coach-brain) ingestion patterns") :
 *
 *   - `<IndividualDiagnosticCard>` : diagnostic chiffres rules-based
 *     (primary pain + métriques + écarts vs N-1), complémentaire du
 *     verdict gainEur-driven déjà visible sur la page Diagnostic.
 *   - `<IndividualCoachingPrep>` : kit coaching alimenté par
 *     `coach_brain_patterns` via `useCoachingPattern`. 4 actions :
 *     Démarrer le coaching (live + email/whatsapp recaps), Ouvrir la
 *     trame (slides plein écran), Copier markdown, Télécharger .md.
 *
 * Largeur élargie à `max-w-2xl` pour confort de lecture des sections kit
 * (Q5 audit). Cadrage générique préservé si `coachingExpertiseId === null`
 * (Q4 audit — coach-brain produit un fallback utile).
 */
function CoachingPrepDrawer({
  open,
  onClose,
  advisorName,
  advisorFirstName,
  advisor,
  expertiseId,
  metrics,
  diagnosis,
}: CoachingPrepDrawerProps) {
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Préparation de l'entretien individuel avec ${advisorName}`}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-border bg-background shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Préparation coaching
            </p>
            <h2 className="mt-1 text-lg font-bold text-foreground">
              Entretien individuel avec {advisorName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <IndividualDiagnosticCard
            advisorFirstName={advisorFirstName}
            diagnosis={diagnosis}
          />
          <IndividualCoachingPrep
            advisor={advisor}
            expertiseId={expertiseId}
            metrics={metrics}
            diagnosis={diagnosis}
          />
        </div>
      </aside>
    </>
  );
}
