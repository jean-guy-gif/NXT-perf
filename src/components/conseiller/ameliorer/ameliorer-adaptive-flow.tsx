"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Wallet } from "lucide-react";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { useUser } from "@/hooks/use-user";
import { useResults } from "@/hooks/use-results";
import { useRatios } from "@/hooks/use-ratios";
import { useUserContext } from "@/hooks/use-user-context";
import { resolveThreshold } from "@/lib/diagnostic/resolve-threshold";
import { Plan30Jours } from "@/components/formation/plan-30-jours";
import { ImprovementCatalogue } from "@/components/dashboard/improvement-catalogue";
import { AgeficeWizard } from "@/components/formation/agefice-wizard";
import { ModalitesTuiles } from "./modalites-tuiles";
import { LeverHeader } from "./lever-header";
import { ChangeLeverConfirm } from "./change-lever-confirm";
import { RecommendedLeverCard } from "./recommended-lever-card";
import { OtherLeversList } from "./other-levers-list";
import { ContinuityBlock } from "./continuity-block";
import { CoachIaBlock } from "./coach-ia-block";
import { FocusedTrainingBlock } from "./focused-training-block";
import { findCriticitePoints } from "@/lib/diagnostic-criticite";
import { getProRationFactor } from "@/lib/performance/pro-rated-objective";
import { volumeToRelatedRatio } from "@/lib/coaching/coach-brain";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";
import { buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import type { Plan30jPayload } from "@/config/coaching";

const FORMATION_OPTIONS = [
  "Prospection immobilière",
  "Estimation et prise de mandat",
  "Exclusivité et valorisation du service",
  "Accompagnement acheteur",
  "Négociation et closing",
  "Suivi de portefeuille et organisation",
];

export function AmeliorerAdaptiveFlow() {
  const { category } = useUser();
  const { computedRatios } = useRatios();
  const results = useResults();
  // Chantier A.3 — contexte 4 axes (override-aware via AdvisorOverrideProvider).
  const userCtx = useUserContext();
  const { resources, getActivePlan, refresh, loading, updateResource } =
    useImprovementResources();
  const searchParams = useSearchParams();
  const preselectedRaw = searchParams.get("levier");
  const preselected =
    preselectedRaw && preselectedRaw in RATIO_EXPERTISE
      ? (preselectedRaw as ExpertiseRatioId)
      : null;

  const [showAgefice, setShowAgefice] = useState(false);
  const [showChangeLever, setShowChangeLever] = useState(false);
  const [archivingPlan, setArchivingPlan] = useState(false);

  // ─── État de chargement initial (P0.3) ───────────────────────────
  if (loading) {
    return <AmeliorerSkeleton />;
  }

  const activePlan = getActivePlan();

  const handleConfirmChangeLever = async () => {
    if (!activePlan || archivingPlan) return;
    setArchivingPlan(true);
    const now = new Date().toISOString();
    try {
      // 1. Détacher un éventuel nxt_coaching lié à ce plan.
      //    On cherche dans `resources` (toutes ressources) un nxt_coaching
      //    dont le payload référence ce plan via `source_plan_id`.
      //    Stati conservés tels quels (action déjà consommée ou hors plan) :
      //      - human_coached : RDV déjà honoré
      //      - subscribed    : abonnement actif hors plan
      //      - cancelled     : déjà annulé
      //      - debrief_used  : debrief IA déjà consommé
      //      - none          : neutre
      //    Stati passés en "cancelled" (en attente, non consommés) :
      //      - debrief_offered, pending_human_coach
      const coachings = resources.filter(
        (r) => r.resource_type === "nxt_coaching"
      );
      for (const coaching of coachings) {
        const payload = (coaching.payload ?? {}) as Record<string, unknown>;
        if (payload.source_plan_id !== activePlan.id) continue;
        const cancellableStatuses = new Set([
          "debrief_offered",
          "pending_human_coach",
        ]);
        const shouldCancel = cancellableStatuses.has(coaching.status);
        if (shouldCancel) {
          await updateResource(coaching.id, {
            status: "cancelled",
            payload: {
              ...payload,
              detached_from_plan_at: now,
              detached_reason: "lever_changed",
              cancelled_at: now,
            },
          });
        } else {
          // On conserve le statut, mais on marque le détachement dans payload
          // pour traçabilité (cohérence : "ce coaching n'est plus rattaché
          // à un plan actif").
          await updateResource(coaching.id, {
            payload: {
              ...payload,
              detached_from_plan_at: now,
              detached_reason: "lever_changed",
            },
          });
        }
      }

      // 2. Archiver le plan_30j actif.
      await updateResource(activePlan.id, {
        status: "expired",
        archived_at: now,
      });
      // refresh est déjà appelé par updateResource — le re-render bascule
      // automatiquement sur le mode no-plan (RecommendedLeverCard).
      setShowChangeLever(false);
    } catch {
      // si erreur, on ferme la modal et on laisse l'utilisateur réessayer
      setShowChangeLever(false);
    } finally {
      setArchivingPlan(false);
    }
  };

  const planMeta = activePlan
    ? (() => {
        const payload = activePlan.payload as unknown as Plan30jPayload;
        const expertiseId = payload.pain_ratio_id as ExpertiseRatioId;
        const expertise = RATIO_EXPERTISE[expertiseId];
        if (!expertise) return null;
        return {
          expertiseId,
          current: payload.baseline_ratio_value ?? null,
          // Chantier A.3 — seuil contextualisé 4 axes via resolveThreshold.
          target: resolveThreshold(expertise, userCtx),
          gain: payload.estimated_ca_loss_eur ?? 0,
        };
      })()
    : null;

  // ─── Mode "Plan actif" ───────────────────────────────────────────
  if (activePlan && planMeta) {
    return (
      <div className="space-y-6">
        {/* 1. Header levier en cours (= levier recommandé pour le plan actif) */}
        <LeverHeader
          expertiseId={planMeta.expertiseId}
          currentValue={planMeta.current}
          targetValue={planMeta.target}
          estimatedGainEur={planMeta.gain}
          mode="plan-active"
          onChangeLever={() => setShowChangeLever(true)}
        />

        {/* 2. Plan 30j détaillé — c'est l'action principale en mode plan-actif */}
        <section aria-label="Plan 30 jours détaillé">
          <Plan30Jours />
        </section>

        {/* 3. Coach IA — bloc discret "Tu veux aller plus vite ?" */}
        <CoachIaBlock />

        {/* 4. Modalités (tuiles M'entraîner / Me former à venir) */}
        <ModalitesTuiles state="plan" />

        {/* 5. Me former — formations contextuelles filtrées sur le levier actif */}
        <FocusedTrainingBlock expertiseId={planMeta.expertiseId} />

        {/* 6. Catalogue complet — replié, secondaire */}
        <details className="rounded-xl border border-border bg-card">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-foreground hover:bg-muted/40">
            Catalogue complet
          </summary>
          <div className="border-t border-border px-5 py-4">
            <ImprovementCatalogue
              ratioId={planMeta.expertiseId}
              ratioName={RATIO_EXPERTISE[planMeta.expertiseId]?.label}
            />
          </div>
        </details>

        {/* 7. Financement formation (option discrète) */}
        <FinancementCta onOpen={() => setShowAgefice(true)} />

        {showAgefice && (
          <AgeficeWizard
            onClose={() => setShowAgefice(false)}
            formationOptions={FORMATION_OPTIONS}
          />
        )}

        <ChangeLeverConfirm
          open={showChangeLever}
          onCancel={() => setShowChangeLever(false)}
          onConfirm={handleConfirmChangeLever}
          archiving={archivingPlan}
        />
      </div>
    );
  }

  // ─── Mode "Pas de plan" ──────────────────────────────────────────
  return (
    <NoPlanFlow
      preselected={preselected}
      computedRatios={computedRatios}
      results={results}
      category={category}
      showAgefice={showAgefice}
      setShowAgefice={setShowAgefice}
      onPlanCreated={() => {
        void refresh();
      }}
    />
  );
}

// ─── No-plan view (extrait pour clarté) ─────────────────────────────────

function NoPlanFlow({
  preselected,
  computedRatios,
  results,
  category,
  showAgefice,
  setShowAgefice,
  onPlanCreated,
}: {
  preselected: ExpertiseRatioId | null;
  computedRatios: ReturnType<typeof useRatios>["computedRatios"];
  results: ReturnType<typeof useResults>;
  category: ReturnType<typeof useUser>["category"];
  showAgefice: boolean;
  setShowAgefice: (b: boolean) => void;
  onPlanCreated: () => void;
}) {
  const allResults = useAllResults();
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const userId = useAppStore((s) => s.user?.id);
  // Chantier A.3 — contexte 4 axes (override-aware).
  const userCtx = useUserContext();

  /**
   * PR3.7.5 — Synchronisation Diagnostic ↔ M'améliorer.
   *
   * Le levier recommandé est dérivé dans cet ordre :
   *   1. URL `?levier=X` (préselection venant de "Améliorer ce point" du drawer)
   *   2. Top criticité ratio si type === "ratio"
   *   3. Top criticité volume → mappé vers le ratio le plus pertinent
   *      via volumeToRelatedRatio (cohérence avec le diagnostic prioritaire,
   *      ex: verdict "Contacts" → levier "contacts_estimations")
   *   4. Premier "other" de criticité qui est un ratio
   */
  const recommended = useMemo(() => {
    if (!results || !userId) return null;
    const measured = buildMeasuredRatios(computedRatios, results);
    // PR3.8.6 hotfix #2 — Toujours proratiser sur today (cf. verdict view).
    // Le levier recommandé reflète "où j'en suis CE MOIS-CI", peu importe la
    // période effective stockée dans `results` (démo Fév 2026 inclus).
    const today = new Date();
    const effectiveMonths = getProRationFactor(today);
    // Chantier A.3 — passe le contexte 4 axes (userCtx override-aware).
    const criticite = findCriticitePoints(
      measured,
      userCtx,
      results,
      category,
      effectiveMonths,
    );

    // 1. Préselection URL prioritaire
    if (preselected && RATIO_EXPERTISE[preselected]) {
      const found = measured.find((m) => m.expertiseId === preselected);
      const fromCriticite = [
        criticite.top,
        ...criticite.others,
      ].find(
        (p) => p && p.type === "ratio" && p.id === preselected
      );
      const expertise = RATIO_EXPERTISE[preselected];
      return {
        expertiseId: preselected,
        currentValue: found?.currentValue ?? null,
        // Chantier A.3 — seuil contextualisé 4 axes.
        targetValue: resolveThreshold(expertise, userCtx),
        estimatedGainEur:
          fromCriticite && fromCriticite.type === "ratio"
            ? fromCriticite.gainEur
            : 0,
        others: criticite.others.filter(
          (p) => p.type === "ratio" && p.id !== preselected
        ),
      };
    }

    // 2-3. Top criticité (ratio direct ou volume mappé)
    const top = criticite.top;
    let chosen: { id: ExpertiseRatioId; gain: number } | null = null;
    if (top) {
      if (top.type === "ratio") {
        chosen = { id: top.id as ExpertiseRatioId, gain: top.gainEur };
      } else {
        const mapped = volumeToRelatedRatio(top.id);
        if (mapped) chosen = { id: mapped, gain: top.gainEur };
      }
    }

    // 4. Fallback : premier other ratio
    if (!chosen) {
      const firstRatio = criticite.others.find((p) => p.type === "ratio");
      if (firstRatio && firstRatio.type === "ratio") {
        chosen = {
          id: firstRatio.id as ExpertiseRatioId,
          gain: firstRatio.gainEur,
        };
      }
    }

    if (!chosen) return null;

    const expertise = RATIO_EXPERTISE[chosen.id];
    if (!expertise) return null;
    const found = measured.find((m) => m.expertiseId === chosen!.id);
    return {
      expertiseId: chosen.id,
      currentValue: found?.currentValue ?? null,
      // Chantier A.3 — seuil contextualisé 4 axes.
      targetValue: resolveThreshold(expertise, userCtx),
      estimatedGainEur: chosen.gain,
      others: criticite.others.filter(
        (p) => p.type === "ratio" && p.id !== chosen!.id
      ),
    };
  }, [
    preselected,
    results,
    computedRatios,
    category,
    allResults,
    agencyObjective,
    userId,
  ]);

  return (
    <div className="space-y-6">
      {/* 1. Levier recommandé cette semaine */}
      {recommended ? (
        <RecommendedLeverCard
          expertiseId={recommended.expertiseId}
          currentValue={recommended.currentValue}
          targetValue={recommended.targetValue}
          estimatedGainEur={recommended.estimatedGainEur}
          onPlanCreated={onPlanCreated}
        />
      ) : (
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Aucun levier prioritaire détecté
          </p>
          <p className="mt-2 text-sm text-foreground">
            Tes ratios sont conformes aux objectifs de ton profil. Continue ta
            saisie hebdomadaire pour suivre ton évolution.
          </p>
        </section>
      )}

      {/* 2. Continuité — debrief du dernier plan archivé si récent */}
      <ContinuityBlock />

      {/* 3. Coach IA — bloc discret "Tu veux aller plus vite ?" */}
      <CoachIaBlock />

      {/* 4. Autres leviers (replié, max 3) */}
      {recommended && recommended.others.length > 0 && (
        <OtherLeversList
          others={recommended.others}
          onPlanCreated={onPlanCreated}
        />
      )}

      {/* 5. Modalités (M'entraîner / Me former à venir) */}
      <ModalitesTuiles state="none" />

      {/* 6. Me former — formations contextuelles filtrées sur le levier
            recommandé. Si pas de levier (état tout vert), bloc caché. */}
      {recommended && (
        <FocusedTrainingBlock expertiseId={recommended.expertiseId} />
      )}

      {/* 7. Catalogue complet — replié, secondaire */}
      <details className="rounded-xl border border-border bg-card">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-foreground hover:bg-muted/40">
          Catalogue complet
        </summary>
        <div className="border-t border-border px-5 py-4">
          <ImprovementCatalogue
            ratioId={recommended?.expertiseId ?? undefined}
            ratioName={
              recommended
                ? RATIO_EXPERTISE[recommended.expertiseId]?.label
                : undefined
            }
          />
        </div>
      </details>

      {/* 8. Financement formation (option) */}
      <FinancementCta onOpen={() => setShowAgefice(true)} />

      {showAgefice && (
        <AgeficeWizard
          onClose={() => setShowAgefice(false)}
          formationOptions={FORMATION_OPTIONS}
        />
      )}
    </div>
  );
}

// ─── Skeleton (P0.3) ─────────────────────────────────────────────────────

function AmeliorerSkeleton() {
  return (
    <div className="space-y-4" aria-live="polite" aria-busy="true">
      <span className="sr-only">Chargement du plan en cours…</span>
      <div className="h-32 animate-pulse rounded-2xl border border-border bg-muted/30" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="h-24 animate-pulse rounded-xl border border-border bg-muted/30" />
        <div className="h-24 animate-pulse rounded-xl border border-border bg-muted/30" />
        <div className="h-24 animate-pulse rounded-xl border border-border bg-muted/30" />
      </div>
      <div className="h-48 animate-pulse rounded-2xl border border-border bg-muted/30" />
      <div className="h-32 animate-pulse rounded-2xl border border-border bg-muted/30" />
    </div>
  );
}

function FinancementCta({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Wallet className="h-3.5 w-3.5" />
        Financement formation
      </div>
      <h3 className="mt-2 text-lg font-bold text-foreground">
        CERFA pré-rempli + droits CPF / OPCO
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Calculez vos droits, générez le CERFA pré-rempli et accédez au point
        d'accueil OPCO.
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Lancer le wizard
      </button>
    </section>
  );
}
