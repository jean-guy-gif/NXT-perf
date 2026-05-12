/**
 * weekly-follow-up-generator — sous-PR Coach-9.
 *
 * Génère un suivi hebdo manager → conseiller en 4 points structurés :
 * Constat / Difficulté / Engagement / Question. RAG-enrichi via Sonnet 4.5
 * + corpus NXT-Coach + doctrine. Contextualisé au conseiller observé
 * (prénom, levier, métriques plan).
 *
 * Méthode NXT : 71% questions ouvertes. Le générateur respecte cette
 * doctrine en formulant les 4 points autour de questions exploratoires.
 *
 * Cache in-memory par (firstName, expertiseId, donePctBucket). Fallback null.
 */

import { coachChat } from "@/lib/server/coach-rag/openrouter-chat";
import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";

export interface WeeklyFollowUpInput {
  firstName: string;
  level?: string;
  expertiseId: ExpertiseRatioId | null;
  /** Métriques plan 30j actuel — null si pas de plan en cours. */
  planMetrics?: {
    dayOfPlan: number;
    totalDays: number;
    donePct: number;
    doneActions: number;
    totalActions: number;
  };
  /** Date ISO de la dernière saisie hebdo. Null si jamais. */
  lastSaisieIso?: string | null;
  /** Ratio actuel sur le levier. Null si pas mesurable. */
  ratioCurrent?: number | null;
  /** Ratio cible sur le levier. */
  ratioTarget?: number | null;
}

export interface WeeklyFollowUpOutput {
  /** Point 1 : Constat factuel — observation sur la semaine. */
  constat: string;
  /** Point 2 : Difficulté — ce qui semble bloquer (sans juger). */
  difficulte: string;
  /** Point 3 : Engagement — 1 action que le manager propose pour la semaine. */
  engagement: string;
  /** Point 4 : Question ouverte — pour explorer avec le conseiller. */
  question: string;
}

interface LlmShape {
  constat?: unknown;
  difficulte?: unknown;
  engagement?: unknown;
  question?: unknown;
}

const CACHE = new Map<string, WeeklyFollowUpOutput>();
const MAX_TOKENS = 900;

function buildUserPrompt(input: WeeklyFollowUpInput): string {
  const expertise = input.expertiseId
    ? RATIO_EXPERTISE[input.expertiseId]
    : null;
  const leverLabel = expertise?.label ?? null;

  const contextLines: string[] = [];
  if (input.planMetrics) {
    contextLines.push(
      `- Plan 30j en cours : J+${input.planMetrics.dayOfPlan}/${input.planMetrics.totalDays} (${input.planMetrics.donePct}% actions cochées, ${input.planMetrics.doneActions}/${input.planMetrics.totalActions})`,
    );
  } else {
    contextLines.push("- Pas de plan 30j actif actuellement");
  }
  if (input.lastSaisieIso) {
    const ageDays = Math.floor(
      (Date.now() - new Date(input.lastSaisieIso).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    contextLines.push(`- Dernière saisie il y a ${ageDays} jours`);
  } else {
    contextLines.push("- Aucune saisie hebdo récente");
  }
  if (
    typeof input.ratioCurrent === "number" &&
    typeof input.ratioTarget === "number"
  ) {
    contextLines.push(
      `- Ratio ${leverLabel ?? "principal"} : ${input.ratioCurrent} (cible ${input.ratioTarget})`,
    );
  }

  return [
    `Génère le contenu du suivi hebdo MANAGER que le manager s'apprête à animer en face-à-face avec ${input.firstName}${input.level ? ` (${input.level})` : ""}.`,
    "",
    leverLabel
      ? `LEVIER EN FOCUS : "${leverLabel}"`
      : "PAS DE LEVIER SPÉCIFIQUE — cadrage général.",
    expertise ? `Diagnostic du levier : ${expertise.diagnosis}` : "",
    "",
    "CONTEXTE CONSEILLER :",
    ...contextLines,
    "",
    "STRUCTURE OBLIGATOIRE — 4 POINTS HEBDO :",
    "1. constat : 1-2 phrases. Observation FACTUELLE de la semaine, citation prénom. Pas de jugement, juste constat (ex: 'On voit que tu as fait 5 estimations cette semaine, et 0 ont conclu en mandat.').",
    "2. difficulte : 1-2 phrases. Hypothèse de ce qui bloque, formulée sous forme d'OUVERTURE (ne pas affirmer, suggérer). Le conseiller doit pouvoir contredire.",
    "3. engagement : 1 action concrète que le manager PROPOSE pour la semaine à venir. Tutoiement direct, action terrain, 25 mots max.",
    "4. question : 1 question OUVERTE (méthode NXT) pour explorer en profondeur. Cite un concept signature NXT si pertinent.",
    "",
    "RÈGLES :",
    `- Tutoiement direct du manager parlant à ${input.firstName}.`,
    "- Cite régulièrement le prénom du conseiller pour personnaliser.",
    "- 71% questions ouvertes (doctrine méthode NXT) — favoriser le 'comment', 'qu'est-ce que', 'quel'.",
    "- Inspire-toi du corpus injecté (sessions réelles + livre Tedesco).",
    "- Cite un concept signature NXT en **gras** si pertinent (CAB, REV, filtre revenu, etc.).",
    "- Phrases courtes, ton terrain Tedesco, pas de bullshit motivationnel.",
    "",
    "FORMAT DE RÉPONSE — JSON strict :",
    `{
  "constat": "...",
  "difficulte": "...",
  "engagement": "...",
  "question": "..."
}`,
  ]
    .filter((s) => s !== "")
    .join("\n");
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

function validate(raw: unknown): WeeklyFollowUpOutput {
  const obj = raw as LlmShape;
  const fields: Array<keyof WeeklyFollowUpOutput> = [
    "constat",
    "difficulte",
    "engagement",
    "question",
  ];
  const result = {} as WeeklyFollowUpOutput;
  for (const f of fields) {
    const value = obj[f];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Missing or empty field: ${f}`);
    }
    result[f] = value.trim();
  }
  return result;
}

export async function getOrGenerateWeeklyFollowUp(
  input: WeeklyFollowUpInput,
): Promise<WeeklyFollowUpOutput | null> {
  const donePctBucket = input.planMetrics
    ? Math.floor(input.planMetrics.donePct / 25) * 25
    : 0;
  const cacheKey = `${input.expertiseId ?? "none"}-${input.firstName.toLowerCase()}-${donePctBucket}`;
  const cached = CACHE.get(cacheKey);
  if (cached) return cached;

  try {
    const userPrompt = buildUserPrompt(input);
    const response = await coachChat(
      [{ role: "user", content: userPrompt }],
      { mode: "strategique", maxTokens: MAX_TOKENS, temperature: 0.5 },
    );
    const parsed = extractJsonObject(response.content);
    const result = validate(parsed);
    CACHE.set(cacheKey, result);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[weekly-follow-up-generator] RAG failed for ${cacheKey}: ${message}`,
    );
    return null;
  }
}
