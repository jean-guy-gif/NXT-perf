"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Wallet } from "lucide-react";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { useUser } from "@/hooks/use-user";
import { useResults } from "@/hooks/use-results";
import { useRatios } from "@/hooks/use-ratios";
import { Plan30Jours } from "@/components/formation/plan-30-jours";
import { ImprovementCatalogue } from "@/components/dashboard/improvement-catalogue";
import { AgeficeWizard } from "@/components/formation/agefice-wizard";
import { ModalitesTuiles } from "./modalites-tuiles";
import { LeverHeader } from "./lever-header";
import { LeverPicker } from "./lever-picker";
import { CoachRdvCard } from "./coach-rdv-card";
import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";
import { deriveProfileLevel } from "@/lib/get-avg-commission";
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
  const { getActivePlan, refresh, loading } = useImprovementResources();
  const searchParams = useSearchParams();
  const preselectedRaw = searchParams.get("levier");
  const preselected =
    preselectedRaw && preselectedRaw in RATIO_EXPERTISE
      ? (preselectedRaw as ExpertiseRatioId)
      : null;

  const [showAgefice, setShowAgefice] = useState(false);

  // ─── État de chargement initial (P0.3) ───────────────────────────
  if (loading) {
    return <AmeliorerSkeleton />;
  }

  const activePlan = getActivePlan();

  const planMeta = activePlan
    ? (() => {
        const payload = activePlan.payload as unknown as Plan30jPayload;
        const expertiseId = payload.pain_ratio_id as ExpertiseRatioId;
        const profile = deriveProfileLevel(category);
        const expertise = RATIO_EXPERTISE[expertiseId];
        if (!expertise) return null;
        return {
          expertiseId,
          current: payload.baseline_ratio_value ?? null,
          target: expertise.thresholds[profile],
          gain: payload.estimated_ca_loss_eur ?? 0,
        };
      })()
    : null;

  // ─── Mode "Plan actif" ───────────────────────────────────────────
  if (activePlan && planMeta) {
    return (
      <div className="space-y-6">
        <LeverHeader
          expertiseId={planMeta.expertiseId}
          currentValue={planMeta.current}
          targetValue={planMeta.target}
          estimatedGainEur={planMeta.gain}
          mode="plan-active"
        />

        <ModalitesTuiles state="plan" />

        <section aria-label="Plan 30 jours détaillé">
          <Plan30Jours />
        </section>

        <CoachRdvCard />

        <section aria-label="Catalogue formations">
          <h2 className="mb-3 text-lg font-bold text-foreground">
            Aller plus loin — Formations
          </h2>
          <ImprovementCatalogue
            ratioId={planMeta.expertiseId}
            ratioName={RATIO_EXPERTISE[planMeta.expertiseId]?.label}
          />
        </section>

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
  // Calcul du headerData pour le LeverHeader (mode "no-plan-preselected")
  const headerData = useMemo(() => {
    if (!preselected || !results) return null;
    const expertise = RATIO_EXPERTISE[preselected];
    if (!expertise) return null;
    const profile = deriveProfileLevel(category);
    const measured = buildMeasuredRatios(computedRatios, results);
    const found = measured.find((m) => m.expertiseId === preselected);
    return {
      expertiseId: preselected,
      currentValue: found?.currentValue ?? null,
      targetValue: expertise.thresholds[profile],
    };
  }, [preselected, results, computedRatios, category]);

  return (
    <div className="space-y-6">
      {headerData && (
        <LeverHeader
          expertiseId={headerData.expertiseId}
          currentValue={headerData.currentValue}
          targetValue={headerData.targetValue}
          estimatedGainEur={0}
          mode="no-plan-preselected"
        />
      )}

      <LeverPicker
        preselected={preselected}
        onPlanCreated={onPlanCreated}
      />
      <ModalitesTuiles state="none" />

      <section aria-label="Catalogue formations">
        <h2 className="mb-3 text-lg font-bold text-foreground">
          Catalogue formations
        </h2>
        <ImprovementCatalogue
          ratioId={preselected ?? undefined}
          ratioName={
            preselected ? RATIO_EXPERTISE[preselected]?.label : undefined
          }
        />
      </section>

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
