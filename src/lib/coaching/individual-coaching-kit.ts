/**
 * Individual coaching kit (PR3.8 follow-up #2 — contextualisation).
 *
 * Génère une trame de coaching 1:1 adaptée au conseiller sélectionné et à
 * son point de douleur réel.
 *
 * Source du contenu : `coach-brain` (label, diagnosis, common causes, top
 * practices). Le manager n'agit pas à la place du conseiller — il aide à
 * verbaliser le frein et à engager une action concrète.
 *
 * Format : `Kit` partagé (sérialisable en markdown léger via
 * `serializeKitToMarkdown`).
 */

import {
  getCommonCauses,
  getDiagnosis,
  getTopPractices,
} from "@/lib/coaching/coach-brain";
import { RATIO_EXPERTISE, type ExpertiseRatioId } from "@/data/ratio-expertise";
import type { Kit } from "@/lib/coaching/team-activation-kit";

export interface CoachingMetrics {
  /** J+X dans le plan (1..totalDays). */
  dayOfPlan: number;
  /** Durée totale du plan (typiquement 30). */
  totalDays: number;
  /** Pourcentage d'actions cochées (0..100). */
  donePct: number;
  doneActions: number;
  totalActions: number;
  remainingActions: number;
}

export interface IndividualCoachingInput {
  /** Conseiller accompagné — au moins le prénom est requis pour personnaliser. */
  advisor: { firstName: string; lastName?: string; level?: string };
  /**
   * Levier en focus :
   *   - tiré du `pain_ratio_id` du plan actif quand disponible (cas 1)
   *   - sinon, levier prioritaire du contexte manager (cas 2)
   *   - sinon `null` (cadrage générique, formulations dégradées)
   */
  expertiseId: ExpertiseRatioId | null;
  /**
   * Métriques du plan actif. Absent ⇒ pas de plan en cours, l'ouverture
   * passe en mode "cadrage" plutôt que "diagnostic d'écart".
   */
  metrics?: CoachingMetrics;
}

export function buildIndividualCoachingKit(
  input: IndividualCoachingInput,
): Kit {
  const { advisor, expertiseId, metrics } = input;
  const firstName = advisor.firstName.trim();

  const expertise = expertiseId ? RATIO_EXPERTISE[expertiseId] : null;
  const leverLabel = expertise?.label ?? null;
  const leverInline = leverLabel ? `« ${leverLabel} »` : "ce levier";

  const diagnosis = expertiseId ? getDiagnosis(expertiseId) : "";
  const causes = expertiseId ? getCommonCauses(expertiseId, 2) : [];
  const practices = expertiseId ? getTopPractices(expertiseId, 3) : [];

  const title = `Trame coaching individuel — ${firstName}`;
  const subtitle = leverLabel
    ? `Une trame pour aider ${firstName} à prendre conscience de son point de blocage et avancer sur ${leverInline}.`
    : `Une trame pour aider ${firstName} à cadrer un accompagnement individuel.`;

  return {
    title,
    subtitle,
    sections: [
      buildOuvertureSection(firstName, leverInline, metrics),
      buildPriseDeConscienceSection(leverInline, diagnosis, causes),
      buildTravailLevierSection(leverLabel, practices),
      buildEngagementSection(firstName),
      buildDecisionManagerSection(),
    ],
  };
}

// ─── A. Ouverture ────────────────────────────────────────────────────────

function buildOuvertureSection(
  firstName: string,
  leverInline: string,
  metrics?: CoachingMetrics,
): { heading: string; bullets: string[] } {
  const bullets: string[] = [];
  if (metrics) {
    // Question factuelle ancrée sur les vrais chiffres du plan.
    bullets.push(
      `Tu es à ${metrics.donePct} % d'avancement à J+${metrics.dayOfPlan}/${metrics.totalDays}, ` +
        `avec ${metrics.doneActions} actions cochées sur ${metrics.totalActions}. ` +
        `Qu'est-ce qui explique cet écart selon toi ?`,
    );
    bullets.push("Qu'est-ce qui a été simple jusqu'à présent ?");
    bullets.push("Qu'est-ce qui a bloqué concrètement ?");
  } else {
    // Pas de plan actif : on cadre l'accompagnement.
    bullets.push(
      `Sur quoi veux-tu progresser en priorité ce mois-ci, ${firstName} ?`,
    );
    bullets.push(
      `Quel est ton ressenti aujourd'hui sur ${leverInline} ?`,
    );
    bullets.push("Qu'est-ce qui t'empêche de t'y mettre concrètement ?");
  }
  return { heading: "A. Ouverture", bullets };
}

// ─── B. Prise de conscience ──────────────────────────────────────────────

function buildPriseDeConscienceSection(
  leverInline: string,
  diagnosis: string,
  causes: string[],
): { heading: string; bullets: string[]; paragraph?: string } {
  const bullets: string[] = [
    `Sur ${leverInline}, qu'est-ce que tes résultats te montrent ?`,
    `À quel moment précis ça bloque dans ta démarche sur ${leverInline} ?`,
    `Qu'est-ce que tu continues à faire qui limite ton résultat sur ${leverInline} ?`,
  ];
  // Si le coach-brain a une cause typique, on la met en référence (texte
  // discret pour le manager, pas une question à poser brutalement).
  if (causes.length > 0) {
    bullets.push(
      `(Référence manager — cause fréquente sur ce levier : « ${causes[0]} »)`,
    );
  }
  return {
    heading: "B. Prise de conscience",
    paragraph: diagnosis || undefined,
    bullets,
  };
}

// ─── C. Travail sur le levier ────────────────────────────────────────────

function buildTravailLevierSection(
  leverLabel: string | null,
  practices: string[],
): { heading: string; bullets: string[] } {
  const bullets: string[] = [];
  if (leverLabel) {
    bullets.push(`Levier en focus : « ${leverLabel} ».`);
  }
  for (const p of practices) bullets.push(p);
  if (practices.length === 0 && !leverLabel) {
    bullets.push(
      "Identifier ensemble le levier le plus en retard à date pour cadrer le coaching.",
    );
  }
  bullets.push(
    "Laquelle de ces pratiques te semble la plus actionnable cette semaine ?",
  );
  return { heading: "C. Travail sur le levier", bullets: bullets.slice(0, 6) };
}

// ─── D. Engagement ───────────────────────────────────────────────────────

function buildEngagementSection(firstName: string): {
  heading: string;
  bullets: string[];
} {
  return {
    heading: "D. Engagement",
    bullets: [
      "Quelle action concrète t'engages-tu à réaliser avant le prochain point ?",
      "Quand exactement (jour, créneau) ?",
      `Comment je peux t'aider d'ici là, ${firstName} ?`,
    ],
  };
}

// ─── E. Décision manager ─────────────────────────────────────────────────

function buildDecisionManagerSection(): {
  heading: string;
  bullets: string[];
} {
  return {
    heading: "E. Décision manager",
    bullets: [
      "Autonomie : le conseiller peut continuer seul, on garde le rythme actuel.",
      "Accompagnement renforcé : prévoir un point individuel rapproché cette semaine.",
      "Point de contrôle hebdo : caler un suivi hebdomadaire dédié à ce levier.",
      "Réajustement du plan : ajuster une action ou changer de levier si besoin.",
    ],
  };
}
