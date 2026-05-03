/**
 * Individual coaching kit (PR3.8 follow-up).
 *
 * Génère une trame de coaching 1:1 prête-à-utiliser pour un manager qui
 * accompagne un conseiller sur son plan 30 jours en cours. Le manager
 * n'agit pas à la place du conseiller — il aide à prendre conscience,
 * lever un blocage, engager une action concrète.
 *
 * Source du contenu : `coach-brain` (top practices + label du levier).
 * Format : `Kit` (même structure que les kits équipe), sérialisable en
 * markdown léger pour copier-coller / .md.
 */

import { getTopPractices } from "@/lib/coaching/coach-brain";
import { RATIO_EXPERTISE, type ExpertiseRatioId } from "@/data/ratio-expertise";
import type { Kit } from "@/lib/coaching/team-activation-kit";

export interface IndividualCoachingInput {
  /** Conseiller accompagné — au moins le prénom est requis pour personnaliser. */
  advisor: { firstName: string; lastName?: string; level?: string };
  /** Levier en focus — tiré du plan actif quand disponible. */
  expertiseId: ExpertiseRatioId | null;
  /** Progression connue du plan, optionnelle. */
  progress?: {
    dayOfPlan: number;
    totalDays: number;
    donePct: number;
    remaining: number;
  };
}

export function buildIndividualCoachingKit(
  input: IndividualCoachingInput,
): Kit {
  const { advisor, expertiseId, progress } = input;
  const firstName = advisor.firstName.trim();
  const expertise = expertiseId ? RATIO_EXPERTISE[expertiseId] : null;
  const leverLabel = expertise?.label ?? null;
  const practices = expertiseId ? getTopPractices(expertiseId, 3) : [];

  const title = `Trame coaching individuel — ${firstName}`;
  const subtitle = leverLabel
    ? `Une trame pour aider ${firstName} à prendre conscience de son point de blocage et avancer sur « ${leverLabel} ».`
    : `Une trame pour aider ${firstName} à prendre conscience de son point de blocage et avancer sur son plan.`;

  // Section "Travail sur le levier" — bullets composés du rappel + 3 pratiques.
  const leverBullets: string[] = [];
  if (leverLabel) {
    leverBullets.push(`Levier en focus : « ${leverLabel} ».`);
  }
  for (const p of practices) {
    leverBullets.push(p);
  }
  if (leverBullets.length === 0) {
    leverBullets.push(
      "Identifier le levier le plus en retard à date pour cadrer le coaching.",
    );
  }
  leverBullets.push("Identifier ensemble UNE action à renforcer cette semaine.");

  return {
    title,
    subtitle,
    sections: [
      {
        heading: "A. Ouverture",
        bullets: [
          progress
            ? `Où en es-tu dans ton plan ? (J+${progress.dayOfPlan}/${progress.totalDays}, ${progress.donePct}% des actions cochées)`
            : "Où en es-tu dans ton plan ?",
          "Qu'est-ce qui a été simple ?",
          "Qu'est-ce qui a bloqué ?",
        ],
      },
      {
        heading: "B. Prise de conscience",
        bullets: [
          "Qu'est-ce que tes résultats te montrent ?",
          "À quel moment ça bloque concrètement ?",
          "Qu'est-ce que tu continues à faire qui limite ton résultat ?",
        ],
      },
      {
        heading: "C. Travail sur le levier",
        bullets: leverBullets.slice(0, 5),
      },
      {
        heading: "D. Engagement",
        bullets: [
          "Quelle action vas-tu faire avant notre prochain point ?",
          "Quand exactement ?",
          "Comment je peux t'aider ?",
        ],
      },
      {
        heading: "E. Décision manager",
        bullets: [
          "Continuer le plan tel quel.",
          "Ajuster une action ou re-prioriser.",
          "Prévoir un point de suivi rapproché.",
          "Basculer sur un module NXT Training si besoin.",
        ],
      },
    ],
  };
}
