/**
 * Synthèse décisionnelle de coaching individuel manager
 * (PR3.8 follow-up — workflow décisionnel).
 *
 * Module PURE — pas de hook, pas de dépendance React. Construit le
 * markdown final de la séance de coaching et applique les règles
 * simples de décision manager (pas d'IA, du déterministe).
 */

import { RATIO_EXPERTISE, type ExpertiseRatioId } from "@/data/ratio-expertise";
import type { CoachingMetrics } from "@/lib/coaching/individual-coaching-kit";

// ─── Types ────────────────────────────────────────────────────────────────

export type CoachingTag =
  | "blocage"
  | "engagement"
  | "resistance"
  | "creuser"
  | null;

export const TAG_LABEL: Record<NonNullable<CoachingTag>, string> = {
  blocage: "Blocage identifié",
  engagement: "Engagement pris",
  resistance: "Résistance",
  creuser: "Point à creuser",
};

export interface SectionAnswer {
  text: string;
  tag: CoachingTag;
}

export interface CoachingSession {
  advisor: { firstName: string; lastName?: string; level?: string };
  expertiseId: ExpertiseRatioId | null;
  metrics?: CoachingMetrics;

  /** Réponses libres par section (clé = id de section). */
  answers: {
    ouverture: SectionAnswer;
    priseDeConscience: SectionAnswer;
    travailLevier: SectionAnswer;
    engagement: SectionAnswer;
    decisionManager: SectionAnswer;
  };

  /** Cause principale retenue (issue de la liste, ou texte libre). */
  selectedCause: string | null;
  selectedCauseCustom: string;

  /** Action prioritaire UNIQUE (single choice forcé). */
  selectedAction: string | null;

  /** Engagement chiffré. */
  commitmentVolume: string;
  commitmentDeadline: string;
  commitmentSchedule: string;
}

export type ManagerDecision =
  | "autonomie_surveillee"
  | "point_hebdo"
  | "accompagnement_renforce";

export const DECISION_LABEL: Record<ManagerDecision, string> = {
  autonomie_surveillee: "Autonomie surveillée",
  point_hebdo: "Point de contrôle hebdomadaire",
  accompagnement_renforce: "Accompagnement renforcé",
};

const DECISION_NEXT_STEP: Record<ManagerDecision, string> = {
  autonomie_surveillee:
    "Laisser dérouler la semaine, refaire le point au prochain rituel équipe.",
  point_hebdo:
    "Caler un point individuel rapide dédié à ce levier la semaine prochaine.",
  accompagnement_renforce:
    "Compléter les éléments manquants (cause, action, ou engagement chiffré) lors d'un point individuel rapproché cette semaine.",
};

// ─── Règles de décision ───────────────────────────────────────────────────

/**
 * Règle déterministe (pas d'IA) :
 *
 *  - Si cause principale OU action OU engagement chiffré manquant
 *    → "Accompagnement renforcé" (le coaching n'a pas abouti à une décision)
 *
 *  - Si engagement clair MAIS retard significatif sur le plan
 *    (donePct < 50 % alors que J+15 ou plus sur 30 jours)
 *    → "Point de contrôle hebdomadaire"
 *
 *  - Sinon → "Autonomie surveillée"
 */
export function deriveManagerDecision(
  session: CoachingSession,
): ManagerDecision {
  const cause =
    session.selectedCause === "custom"
      ? session.selectedCauseCustom.trim()
      : session.selectedCause;
  const noCause = !cause || cause.trim().length === 0;
  const noAction = !session.selectedAction;
  const noQuantifiedCommitment =
    !session.commitmentVolume.trim() || !session.commitmentDeadline.trim();

  if (noCause || noAction || noQuantifiedCommitment) {
    return "accompagnement_renforce";
  }

  const m = session.metrics;
  if (m && m.totalDays > 0) {
    const halfwayThroughPlan = m.dayOfPlan >= Math.ceil(m.totalDays / 2);
    const significantlyLate = m.donePct < 50;
    if (halfwayThroughPlan && significantlyLate) {
      return "point_hebdo";
    }
  }

  return "autonomie_surveillee";
}

// ─── Markdown builder ─────────────────────────────────────────────────────

interface DecisionSummary {
  /** Markdown léger sérialisé (copier-coller / télécharger .md). */
  markdown: string;
  /** Décision retenue (dérivée par `deriveManagerDecision`). */
  decision: ManagerDecision;
}

export function buildCoachingDecisionSummary(
  session: CoachingSession,
): DecisionSummary {
  const decision = deriveManagerDecision(session);
  const fullName = `${session.advisor.firstName}${session.advisor.lastName ? " " + session.advisor.lastName : ""}`;
  const expertise = session.expertiseId
    ? RATIO_EXPERTISE[session.expertiseId]
    : null;
  const leverLabel = expertise?.label ?? "Levier non sélectionné";

  const lines: string[] = [];

  lines.push(`# Synthèse coaching individuel — ${fullName}`);
  lines.push("");

  lines.push(`## Conseiller`);
  lines.push("");
  lines.push(`- ${fullName}${session.advisor.level ? ` (${session.advisor.level})` : ""}`);
  lines.push("");

  lines.push(`## Levier travaillé`);
  lines.push("");
  lines.push(`- ${leverLabel}`);
  lines.push("");

  lines.push(`## Constat de départ`);
  lines.push("");
  if (session.metrics) {
    const m = session.metrics;
    lines.push(
      `- ${m.donePct} % d'avancement à J+${m.dayOfPlan}/${m.totalDays}, ${m.doneActions}/${m.totalActions} actions cochées (${m.remainingActions} restantes).`,
    );
  } else {
    lines.push(`- Pas de plan actif — coaching de cadrage.`);
  }
  if (session.answers.ouverture.text.trim()) {
    lines.push(`- Réponse conseiller (ouverture) : ${session.answers.ouverture.text.trim()}`);
  }
  lines.push("");

  lines.push(`## Cause principale retenue`);
  lines.push("");
  const cause =
    session.selectedCause === "custom"
      ? session.selectedCauseCustom.trim()
      : session.selectedCause;
  lines.push(cause ? `- ${cause}` : `- _Non renseignée._`);
  if (session.answers.priseDeConscience.text.trim()) {
    lines.push(
      `- Verbatim conseiller : ${session.answers.priseDeConscience.text.trim()}`,
    );
  }
  lines.push("");

  lines.push(`## Action prioritaire décidée`);
  lines.push("");
  lines.push(
    session.selectedAction
      ? `- ${session.selectedAction}`
      : `- _Aucune action retenue._`,
  );
  if (session.answers.travailLevier.text.trim()) {
    lines.push(
      `- Note manager : ${session.answers.travailLevier.text.trim()}`,
    );
  }
  lines.push("");

  lines.push(`## Engagement chiffré`);
  lines.push("");
  if (
    session.commitmentVolume.trim() ||
    session.commitmentDeadline.trim() ||
    session.commitmentSchedule.trim()
  ) {
    if (session.commitmentVolume.trim())
      lines.push(`- Volume : ${session.commitmentVolume.trim()}`);
    if (session.commitmentDeadline.trim())
      lines.push(`- Échéance : ${session.commitmentDeadline.trim()}`);
    if (session.commitmentSchedule.trim())
      lines.push(`- Créneau / fréquence : ${session.commitmentSchedule.trim()}`);
  } else {
    lines.push(`- _Engagement non chiffré._`);
  }
  if (session.answers.engagement.text.trim()) {
    lines.push(
      `- Verbatim conseiller : ${session.answers.engagement.text.trim()}`,
    );
  }
  lines.push("");

  lines.push(`## Niveau de suivi recommandé`);
  lines.push("");
  lines.push(`- **${DECISION_LABEL[decision]}**`);
  lines.push("");

  lines.push(`## Prochaine étape manager`);
  lines.push("");
  lines.push(`- ${DECISION_NEXT_STEP[decision]}`);
  if (session.answers.decisionManager.text.trim()) {
    lines.push(
      `- Note manager : ${session.answers.decisionManager.text.trim()}`,
    );
  }

  // Tags rapides agrégés (si renseignés)
  const tags = [
    session.answers.ouverture.tag,
    session.answers.priseDeConscience.tag,
    session.answers.travailLevier.tag,
    session.answers.engagement.tag,
    session.answers.decisionManager.tag,
  ].filter((t): t is NonNullable<CoachingTag> => t !== null);
  if (tags.length > 0) {
    lines.push("");
    lines.push(`## Tags`);
    lines.push("");
    const counts = new Map<string, number>();
    for (const t of tags) counts.set(TAG_LABEL[t], (counts.get(TAG_LABEL[t]) ?? 0) + 1);
    for (const [label, count] of counts.entries()) {
      lines.push(`- ${label}${count > 1 ? ` (×${count})` : ""}`);
    }
  }

  return {
    markdown: lines.join("\n") + "\n",
    decision,
  };
}

// ─── Helpers exportés pour le composant ───────────────────────────────────

export function emptySession(input: {
  advisor: CoachingSession["advisor"];
  expertiseId: ExpertiseRatioId | null;
  metrics?: CoachingMetrics;
}): CoachingSession {
  return {
    advisor: input.advisor,
    expertiseId: input.expertiseId,
    metrics: input.metrics,
    answers: {
      ouverture: { text: "", tag: null },
      priseDeConscience: { text: "", tag: null },
      travailLevier: { text: "", tag: null },
      engagement: { text: "", tag: null },
      decisionManager: { text: "", tag: null },
    },
    selectedCause: null,
    selectedCauseCustom: "",
    selectedAction: null,
    commitmentVolume: "",
    commitmentDeadline: "",
    commitmentSchedule: "",
  };
}
