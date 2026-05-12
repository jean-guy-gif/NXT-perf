"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Lightbulb,
  ArrowRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { Axis } from "@/lib/comparison";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

interface Props {
  /** Nom de l'entité comparée (ex: "Sophie Lemaire", "Profil Expert") */
  otherLabel: string;
  /** Axes de ratios — c'est sur les ratios qu'on cherche le levier travail */
  ratioAxes: Axis[];
  /** Map axis.id → ExpertiseRatioId pour le lien "Travailler ce point" */
  axisToExpertise: Record<string, ExpertiseRatioId>;
}

/** Sous-PR Coach-15 : narratif RAG d'insight comparaison. */
interface RagInsight {
  narrative: string;
  keyInsight: string;
  keyQuestion: string;
}

export function ComparisonInsightCard({
  otherLabel,
  ratioAxes,
  axisToExpertise,
}: Props) {
  // Trouve le plus gros écart où je suis en retard (other > me)
  const biggestGap = ratioAxes
    .map((a) => ({
      ...a,
      gap: a.other - a.me,
    }))
    .filter((a) => a.gap > 0)
    .sort((a, b) => b.gap - a.gap)[0];

  // Sous-PR Coach-15 : fetch lazy l'insight RAG quand un écart est détecté.
  const [ragInsight, setRagInsight] = useState<RagInsight | null>(null);
  const [ragLoading, setRagLoading] = useState(false);

  useEffect(() => {
    if (!biggestGap) {
      setRagInsight(null);
      return;
    }
    let cancelled = false;
    setRagLoading(true);
    setRagInsight(null);
    const expertiseId = axisToExpertise[biggestGap.id] ?? null;
    fetch("/api/comparison-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        otherLabel,
        biggestGap: {
          axisId: biggestGap.id,
          label: biggestGap.label,
          me: biggestGap.me,
          other: biggestGap.other,
          gap: biggestGap.gap,
        },
        expertiseId,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { insight: RagInsight | null };
        if (!cancelled && data.insight) {
          setRagInsight(data.insight);
        }
      })
      .catch((err) => {
        console.error("[comparison-insight-card] RAG fetch failed", err);
      })
      .finally(() => {
        if (!cancelled) setRagLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [otherLabel, biggestGap, axisToExpertise]);

  if (!biggestGap) {
    return (
      <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-500">
          <Lightbulb className="h-3.5 w-3.5" />
          Insight
        </div>
        <p className="mt-2 text-sm text-foreground">
          Vs <span className="font-semibold">{otherLabel}</span>, vos ratios
          sont au niveau ou meilleurs sur tous les axes mesurés. Continuez
          ainsi !
        </p>
      </section>
    );
  }

  const expertiseId = axisToExpertise[biggestGap.id];
  const ameliorerHref = expertiseId
    ? `/conseiller/ameliorer?levier=${expertiseId}`
    : "/conseiller/ameliorer";

  return (
    <section className="rounded-xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <Lightbulb className="h-3.5 w-3.5" />
          Insight
        </span>
        {(ragLoading || ragInsight) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
            {ragLoading && !ragInsight ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Coach NXT
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                Coach NXT
              </>
            )}
          </span>
        )}
      </div>

      {/* Sous-PR Coach-15 : si RAG dispo, narratif Tedesco. Sinon fallback factuel. */}
      {ragInsight ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-relaxed text-foreground">
            {ragInsight.narrative}
          </p>
          <p className="rounded-md border border-primary/20 bg-card px-3 py-2 text-sm font-medium text-foreground">
            {ragInsight.keyInsight}
          </p>
          <p className="rounded-md bg-indigo-50/60 px-3 py-2 text-xs font-medium italic text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
            💬 {ragInsight.keyQuestion}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-foreground">
          Vs <span className="font-semibold">{otherLabel}</span>, votre plus
          grand écart est sur{" "}
          <span className="font-semibold">{biggestGap.label}</span> (
          {biggestGap.me}% vs {biggestGap.other}%) — c&apos;est aussi votre
          levier prioritaire.
        </p>
      )}

      <Link
        href={ameliorerHref}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Travailler ce point
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
