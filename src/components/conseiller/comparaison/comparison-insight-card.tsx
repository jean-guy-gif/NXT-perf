"use client";

import Link from "next/link";
import { Lightbulb, ArrowRight } from "lucide-react";
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
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <Lightbulb className="h-3.5 w-3.5" />
        Insight
      </div>
      <p className="mt-2 text-sm text-foreground">
        Vs <span className="font-semibold">{otherLabel}</span>, votre plus
        grand écart est sur{" "}
        <span className="font-semibold">{biggestGap.label}</span> ({biggestGap.me}%
        vs {biggestGap.other}%) — c'est aussi votre levier prioritaire.
      </p>
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
