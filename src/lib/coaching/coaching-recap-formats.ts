/**
 * Formats de récapitulatif post-coaching (PR3.8 follow-up).
 *
 * Module PURE — produit deux formats prêts à envoyer au conseiller :
 *   - email professionnel (multi-paragraphe, structure formelle)
 *   - WhatsApp court (lignes courtes, ton direct, pas d'emojis pour
 *     respecter la convention projet ; le manager les ajoutera lui-même
 *     s'il veut)
 *
 * S'appuie sur :
 *   - `CoachingSession` (saisie de la séance)
 *   - `AdvisorDiagnosis` (point de douleur + chiffres) — optionnel
 *   - `ManagerDecision` dérivée (niveau de suivi)
 */

import { RATIO_EXPERTISE } from "@/data/ratio-expertise";
import {
  DECISION_LABEL,
  deriveManagerDecision,
  type CoachingSession,
  type ManagerDecision,
} from "@/lib/coaching/coaching-decision-summary";
import type { AdvisorDiagnosis } from "@/lib/coaching/advisor-diagnosis";

interface RecapInput {
  session: CoachingSession;
  diagnosis?: AdvisorDiagnosis | null;
}

const NEXT_STEP_BY_DECISION: Record<ManagerDecision, string> = {
  autonomie_surveillee:
    "On se revoit au prochain rituel équipe pour faire le point.",
  point_hebdo:
    "On cale un point individuel rapide dédié à ce levier la semaine prochaine.",
  accompagnement_renforce:
    "On reprend ensemble cette semaine pour compléter le plan.",
};

// ─── Email professionnel ─────────────────────────────────────────────────

export function buildEmailRecap({ session, diagnosis }: RecapInput): string {
  const decision = deriveManagerDecision(session);
  const advisorName = session.advisor.firstName.trim();
  const expertise = session.expertiseId
    ? RATIO_EXPERTISE[session.expertiseId]
    : null;
  const leverLabel = expertise?.label ?? "le levier travaillé";

  const cause =
    session.selectedCause === "custom"
      ? session.selectedCauseCustom.trim()
      : session.selectedCause;
  const action = session.selectedAction;
  const commitmentParts: string[] = [];
  if (session.commitmentVolume.trim())
    commitmentParts.push(session.commitmentVolume.trim());
  if (session.commitmentDeadline.trim())
    commitmentParts.push(`d'ici ${session.commitmentDeadline.trim()}`);
  if (session.commitmentSchedule.trim())
    commitmentParts.push(`(${session.commitmentSchedule.trim()})`);
  const commitmentLine = commitmentParts.length
    ? commitmentParts.join(" ")
    : null;

  const lines: string[] = [];
  lines.push(`Objet : Suivi coaching — ${leverLabel}`);
  lines.push("");
  lines.push(`Bonjour ${advisorName},`);
  lines.push("");
  lines.push(
    `Je te fais un récap rapide de notre point coaching pour qu'on parte tous les deux sur la même base.`,
  );
  lines.push("");

  if (diagnosis?.primary) {
    lines.push(`POINT DE DOULEUR IDENTIFIÉ`);
    lines.push(`${diagnosis.primary.label}.`);
    lines.push(diagnosis.primary.justification);
    lines.push("");
  }

  lines.push(`CAUSE PRINCIPALE RETENUE`);
  lines.push(cause ? cause : "À préciser ensemble lors du prochain point.");
  lines.push("");

  lines.push(`ACTION PRIORITAIRE`);
  lines.push(action ? action : "À choisir ensemble lors du prochain point.");
  lines.push("");

  lines.push(`ENGAGEMENT`);
  lines.push(commitmentLine ? commitmentLine : "À chiffrer.");
  lines.push("");

  lines.push(`PROCHAINE ÉTAPE`);
  lines.push(NEXT_STEP_BY_DECISION[decision]);
  lines.push(`(Niveau de suivi : ${DECISION_LABEL[decision]}.)`);
  lines.push("");

  lines.push(`Compte sur moi si tu as besoin d'un coup de main avant.`);
  lines.push("");
  lines.push(`Bon courage,`);
  lines.push(`[Manager]`);

  return lines.join("\n") + "\n";
}

// ─── WhatsApp court ──────────────────────────────────────────────────────

export function buildWhatsappRecap({ session, diagnosis }: RecapInput): string {
  const decision = deriveManagerDecision(session);
  const advisorName = session.advisor.firstName.trim();
  const expertise = session.expertiseId
    ? RATIO_EXPERTISE[session.expertiseId]
    : null;
  const leverLabel = expertise?.label ?? "ton levier";

  const cause =
    session.selectedCause === "custom"
      ? session.selectedCauseCustom.trim()
      : session.selectedCause;
  const action = session.selectedAction;
  const volume = session.commitmentVolume.trim();
  const deadline = session.commitmentDeadline.trim();

  const lines: string[] = [];
  lines.push(`Hello ${advisorName},`);
  lines.push("");
  lines.push(`Récap rapide de notre point :`);
  lines.push("");
  lines.push(`Focus : ${diagnosis?.primary?.label ?? leverLabel}`);
  if (cause) {
    lines.push(`Cause : ${truncate(cause, 80)}`);
  }
  if (action) {
    lines.push(`Action : ${truncate(action, 100)}`);
  }
  if (volume || deadline) {
    const eng = [volume, deadline ? `d'ici ${deadline}` : null]
      .filter(Boolean)
      .join(" ");
    lines.push(`Engagement : ${eng}`);
  }
  lines.push("");
  lines.push(NEXT_STEP_BY_DECISION[decision]);
  lines.push("");
  lines.push(`A toi de jouer !`);

  return lines.join("\n") + "\n";
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}
