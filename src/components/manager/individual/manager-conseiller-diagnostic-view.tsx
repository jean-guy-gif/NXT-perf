"use client";

import { useMemo, useState } from "react";
import { MessageCircleHeart, Sparkles, X } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useResults } from "@/hooks/use-results";
import { useRatios } from "@/hooks/use-ratios";
import { useUserContext } from "@/hooks/use-user-context";
import { buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import { findCriticitePoints } from "@/lib/diagnostic-criticite";
import { getProRationFactor } from "@/lib/performance/pro-rated-objective";
import { DiagnosticVerdictCard } from "@/components/conseiller/diagnostic/diagnostic-verdict-card";
import { WhyDangerDrawer } from "@/components/conseiller/diagnostic/why-danger-drawer";
import { KeyFiguresAccordion } from "@/components/conseiller/diagnostic/key-figures-accordion";
import { AdvisorActivePlanReadOnly } from "@/components/manager/individual/advisor-active-plan-readonly";

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

  const [drawerMode, setDrawerMode] = useState<"single" | "list" | null>(null);
  const [coachingPrepOpen, setCoachingPrepOpen] = useState(false);

  // Prénom dérivé pour les libellés courts ("de Jean-Marc"). On garde le nom
  // complet (`advisorDisplayName`) pour l'aria-label du drawer coaching.
  const firstName = useMemo(
    () => advisorDisplayName.split(" ")[0] || advisorDisplayName,
    [advisorDisplayName],
  );

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
      />
    </div>
  );
}

// ─── Drawer Coaching Prep (placeholder Chantier D) ───────────────────────

interface CoachingPrepDrawerProps {
  open: boolean;
  onClose: () => void;
  advisorName: string;
}

/**
 * Drawer latéral V1 placeholder — le contenu IA détaillé arrive en Chantier D.
 * Cohérent avec la philosophie "drawer partout" introduite en PR3.6 (brief P1).
 */
function CoachingPrepDrawer({
  open,
  onClose,
  advisorName,
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
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl"
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
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-primary" />
            <h3 className="mt-3 text-base font-semibold text-foreground">
              Bientôt disponible
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Le contenu de cet entretien sera généré par IA en Chantier D
              (à venir) : synthèse du diagnostic, points
              d&apos;attention, axes de discussion, et trame d&apos;échange
              recommandée.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
