/**
 * nudge-generator — sous-PR Coach-6.1.
 *
 * Génère un "nudge" personnalisé (notification proactive) pour le conseiller
 * en fonction de son état actuel (saisie, plan 30j, ratio). 4 triggers gérés
 * par ordre de priorité :
 *
 *   1. NO_RECENT_SAISIE : pas de saisie depuis +7 jours
 *   2. RATIO_DEGRADING : ratio prioritaire dégradé semaine vs semaine
 *   3. PLAN_BEHIND : plan 30j actif J+15+ avec <50% actions cochées
 *   4. PLAN_JUST_EXPIRED : plan 30j vient de se terminer (offre debrief)
 *
 * 1 seul nudge retourné (le plus prioritaire détecté). RAG enrichit le
 * message via Sonnet 4.5 + corpus + doctrine. Fallback silencieux null.
 */

import { coachChat } from "@/lib/server/coach-rag/openrouter-chat";
import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";

export type NudgeTrigger =
  | "NO_RECENT_SAISIE"
  | "RATIO_DEGRADING"
  | "PLAN_BEHIND"
  | "PLAN_JUST_EXPIRED";

export interface NudgeContext {
  /** ISO date du dernier periodEnd (results le plus récent). Null si jamais saisi. */
  lastSaisieIso: string | null;
  /** Levier prioritaire détecté. Null si aucun. */
  topPainExpertiseId: ExpertiseRatioId | null;
  /** Ratio dégradé semaine vs semaine — delta négatif si dégradation. */
  ratioWeekOverWeekDelta: number | null;
  /** Plan 30j actif : nb actions cochées / total + jours écoulés. */
  activePlan: {
    expertiseId: ExpertiseRatioId;
    daysSinceStart: number;
    actionsDone: number;
    actionsTotal: number;
  } | null;
  /** Plan 30j juste expiré dans les 7 derniers jours. */
  recentExpiredPlan: {
    expertiseId: ExpertiseRatioId;
    daysSinceExpiry: number;
  } | null;
}

export interface NudgeOutput {
  trigger: NudgeTrigger;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}

const MAX_TOKENS = 600;

function detectTrigger(ctx: NudgeContext): NudgeTrigger | null {
  // 1. Plan juste expiré → priorité haute (rétention)
  if (ctx.recentExpiredPlan && ctx.recentExpiredPlan.daysSinceExpiry <= 7) {
    return "PLAN_JUST_EXPIRED";
  }
  // 2. Pas de saisie depuis +7 jours
  if (!ctx.lastSaisieIso) return "NO_RECENT_SAISIE";
  const lastSaisieAge =
    (Date.now() - new Date(ctx.lastSaisieIso).getTime()) /
    (1000 * 60 * 60 * 24);
  if (lastSaisieAge > 7) return "NO_RECENT_SAISIE";
  // 3. Plan en retard
  if (
    ctx.activePlan &&
    ctx.activePlan.daysSinceStart >= 15 &&
    ctx.activePlan.actionsTotal > 0 &&
    ctx.activePlan.actionsDone / ctx.activePlan.actionsTotal < 0.5
  ) {
    return "PLAN_BEHIND";
  }
  // 4. Ratio dégradé week-over-week
  if (
    ctx.ratioWeekOverWeekDelta !== null &&
    ctx.ratioWeekOverWeekDelta < -10 &&
    ctx.topPainExpertiseId
  ) {
    return "RATIO_DEGRADING";
  }
  return null;
}

function buildUserPrompt(
  trigger: NudgeTrigger,
  ctx: NudgeContext,
): string {
  const lever = ctx.topPainExpertiseId
    ? RATIO_EXPERTISE[ctx.topPainExpertiseId]
    : null;
  const triggerContext: Record<NudgeTrigger, string> = {
    NO_RECENT_SAISIE: `Le conseiller n'a pas fait sa saisie depuis ${ctx.lastSaisieIso ? Math.round((Date.now() - new Date(ctx.lastSaisieIso).getTime()) / (1000 * 60 * 60 * 24)) : "plus de 7"} jours.`,
    RATIO_DEGRADING: `Le ratio "${lever?.label ?? "principal"}" s'est dégradé de ${ctx.ratioWeekOverWeekDelta} pts cette semaine.`,
    PLAN_BEHIND: `Le conseiller est à J+${ctx.activePlan?.daysSinceStart}/30 sur son plan 30j (${ctx.activePlan?.actionsDone}/${ctx.activePlan?.actionsTotal} actions cochées, retard).`,
    PLAN_JUST_EXPIRED: `Le plan 30j sur "${ctx.recentExpiredPlan?.expertiseId}" s'est terminé il y a ${ctx.recentExpiredPlan?.daysSinceExpiry} jours.`,
  };

  return [
    `Génère un NUDGE proactif pour un conseiller immobilier sur l'application NXT Performance.`,
    "",
    `TRIGGER : ${trigger}`,
    triggerContext[trigger],
    "",
    "STRUCTURE ATTENDUE :",
    "- title : 6-9 mots, accrocheur, ton terrain Tedesco, tutoiement direct. Pas de point d'exclamation excessif.",
    "- body : 1-2 phrases concrètes. Un constat factuel + 1 question ouverte OU 1 micro-action.",
    "- ctaLabel : 3-5 mots, impératif (ex: 'Faire ma saisie', 'Reprendre mon plan').",
    "",
    "RÈGLES :",
    "- Tutoiement direct, ton terrain Tedesco (pas guimauve, pas pression).",
    "- Inspire-toi du corpus injecté et de la méthode NXT (privilégier Q ouvertes).",
    "- Phrases courtes.",
    "",
    "FORMAT DE RÉPONSE — JSON strict :",
    `{
  "title": "...",
  "body": "...",
  "ctaLabel": "..."
}`,
  ].join("\n");
}

function extractJsonObject(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    /* fallthrough */
  }
  const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* fallthrough */
    }
  }
  const first = content.indexOf("{");
  const last = content.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(content.slice(first, last + 1));
    } catch {
      /* fallthrough */
    }
  }
  throw new Error("LLM output is not valid JSON");
}

function ctaHrefForTrigger(trigger: NudgeTrigger): string {
  switch (trigger) {
    case "NO_RECENT_SAISIE":
      return "/saisie";
    case "RATIO_DEGRADING":
      return "/conseiller/diagnostic";
    case "PLAN_BEHIND":
      return "/conseiller/ameliorer";
    case "PLAN_JUST_EXPIRED":
      return "/coaching-debrief";
  }
}

export async function generateNudge(
  ctx: NudgeContext,
): Promise<NudgeOutput | null> {
  const trigger = detectTrigger(ctx);
  if (!trigger) return null;

  try {
    const userPrompt = buildUserPrompt(trigger, ctx);
    const response = await coachChat(
      [{ role: "user", content: userPrompt }],
      { mode: "strategique", maxTokens: MAX_TOKENS, temperature: 0.5 },
    );
    const parsed = extractJsonObject(response.content) as Record<
      string,
      unknown
    >;
    const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
    const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
    const ctaLabel =
      typeof parsed.ctaLabel === "string" ? parsed.ctaLabel.trim() : "";
    if (!title || !body || !ctaLabel) {
      throw new Error("Missing fields in nudge response");
    }
    return {
      trigger,
      title,
      body,
      ctaLabel,
      ctaHref: ctaHrefForTrigger(trigger),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[nudge-generator] RAG failed for ${trigger}: ${message}`);
    return null;
  }
}
