"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { useResults, useAllResults } from "@/hooks/use-results";
import { useRatios } from "@/hooks/use-ratios";
import { useImprovementResources } from "@/hooks/use-improvement-resources";
import { useAppStore } from "@/stores/app-store";
import { buildMeasuredRatios } from "@/lib/ratio-to-expertise";
import {
  deriveProfileLevel,
  getAvgCommissionEur,
} from "@/lib/get-avg-commission";
import {
  findCriticitePoints,
  type CriticitePoint,
} from "@/lib/diagnostic-criticite";
import { DiagnosticVerdictCard } from "@/components/conseiller/diagnostic/diagnostic-verdict-card";
import { WhyDangerDrawer } from "@/components/conseiller/diagnostic/why-danger-drawer";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import { useMemo } from "react";

export function DiagnosticVerdictView() {
  const router = useRouter();
  const { user, category } = useUser();
  const { computedRatios } = useRatios();
  const results = useResults();
  const allResults = useAllResults();
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const { createPlan30j } = useImprovementResources();

  const [drawerMode, setDrawerMode] = useState<"single" | "list" | null>(null);
  const [improving, setImproving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const criticite = useMemo(() => {
    if (!user || !results || computedRatios.length === 0)
      return { top: null, others: [] };
    const measured = buildMeasuredRatios(computedRatios, results);
    const profile = deriveProfileLevel(category);
    const myHistory = allResults.filter((r) => r.userId === user.id);
    const avg = getAvgCommissionEur(agencyObjective?.avgActValue, myHistory);
    return findCriticitePoints(measured, profile, avg, results, category, 1);
  }, [
    user,
    results,
    computedRatios,
    category,
    allResults,
    agencyObjective,
  ]);

  const handleSavoirPourquoi = () => {
    setDrawerMode("single");
  };

  const handleAmeliorer = async (point: CriticitePoint) => {
    if (!user || !results) return;
    setImproving(true);
    setToast(null);
    try {
      if (point.type === "ratio") {
        const measured = buildMeasuredRatios(computedRatios, results);
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
        });
      }
      // Pour un volume : on redirige sans plan ciblé — l'utilisateur choisira
      // un levier dans LeverPicker.
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

      {toast && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm text-orange-600">
          {toast}
        </div>
      )}

      <WhyDangerDrawer
        open={drawerMode !== null}
        onClose={() => setDrawerMode(null)}
        mode={drawerMode ?? "list"}
        verdict={drawerMode === "single" ? criticite.top : null}
        otherPainPoints={drawerMode === "list" ? criticite.others : []}
      />
    </div>
  );
}
