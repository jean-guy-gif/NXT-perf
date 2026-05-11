/**
 * weekly-brief-generator — fiche pédagogique semaine via RAG.
 *
 * Sous-PR Coach-1 : génère les 32 fiches (8 ratios × 4 semaines) à la volée
 * via coachChat() au lieu d'un catalogue statique.
 *
 * Cache in-memory (Map) avec clé `${expertiseId}-W${weekNumber}` — TTL session.
 * Fallback : si RAG fail, lookup dans WEEKLY_BRIEFS hardcoded (1 STUB
 * actuellement) ou retourne null pour empty state gracieux côté drawer.
 */

import { coachChat } from "@/lib/server/coach-rag/openrouter-chat";
import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";
import { WEEKLY_BRIEFS, type WeeklyBrief } from "@/data/weekly-briefs";

const CACHE = new Map<string, WeeklyBrief>();
const MAX_TOKENS = 1400;

interface LlmBriefShape {
  why3Actions?: unknown;
  bestPractices?: unknown;
  errorsToAvoid?: unknown;
}

const WEEK_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Diagnostic & premier réflexe",
  2: "Ancrage des meilleures pratiques",
  3: "Mise en pratique intensive",
  4: "Consolidation & automatisme",
};

function buildUserPrompt(
  expertiseId: ExpertiseRatioId,
  weekNumber: 1 | 2 | 3 | 4,
  weekTheme: string | null,
): string {
  const expertise = RATIO_EXPERTISE[expertiseId];
  const label = WEEK_LABELS[weekNumber];
  return [
    `Génère la fiche pédagogique de la SEMAINE ${weekNumber} (${label}) du plan 30j sur le levier "${expertise.label}".`,
    "",
    weekTheme ? `Focus de la semaine fourni par le plan : "${weekTheme}"` : "",
    "",
    "STRUCTURE ATTENDUE :",
    "- why3Actions : 1 paragraphe de 3-5 phrases qui explique pourquoi ces 3 actions ensemble cette semaine.",
    "- bestPractices : 3-5 puces (1 phrase chacune) — ce que font les MEILLEURS conseillers sur cette semaine précise.",
    "- errorsToAvoid : 3-5 puces (1 phrase chacune) — pièges classiques sur cette semaine précise.",
    "",
    "RÈGLES :",
    "- Tutoiement direct, ton terrain, pas de théorie.",
    "- Cite des concepts signature NXT si pertinent.",
    "- Inspire-toi des chunks et synthèses du corpus injecté ci-dessus.",
    "",
    "FORMAT DE RÉPONSE — JSON strict, aucun texte hors de l'objet :",
    `{
  "why3Actions": "...",
  "bestPractices": ["...", "...", "..."],
  "errorsToAvoid": ["...", "...", "..."]
}`,
  ]
    .filter((s) => s.length > 0)
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

function validateBrief(
  raw: unknown,
  expertiseId: ExpertiseRatioId,
  weekNumber: 1 | 2 | 3 | 4,
  focus: string,
): WeeklyBrief {
  const obj = raw as LlmBriefShape;
  const why = typeof obj.why3Actions === "string" ? obj.why3Actions.trim() : "";
  if (why.length === 0) throw new Error("missing why3Actions");

  const bp = Array.isArray(obj.bestPractices)
    ? obj.bestPractices
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .slice(0, 5)
    : [];
  if (bp.length < 3) throw new Error(`bestPractices needs 3-5 items, got ${bp.length}`);

  const errs = Array.isArray(obj.errorsToAvoid)
    ? obj.errorsToAvoid
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .slice(0, 5)
    : [];
  if (errs.length < 3) throw new Error(`errorsToAvoid needs 3-5 items, got ${errs.length}`);

  return {
    painRatioId: expertiseId,
    weekNumber,
    focus,
    why3Actions: why,
    bestPractices: bp,
    errorsToAvoid: errs,
  };
}

/**
 * Récupère ou génère via RAG la fiche pédagogique d'une semaine.
 * Cache in-memory partagé serveur (perdu au redémarrage process).
 *
 * Fallback : si RAG fail, retourne le brief hardcoded WEEKLY_BRIEFS s'il
 * existe pour ce couple (expertiseId, weekNumber), sinon null (drawer
 * affichera empty state gracieux).
 */
export async function getOrGenerateWeeklyBrief(
  expertiseId: ExpertiseRatioId,
  weekNumber: 1 | 2 | 3 | 4,
  weekTheme: string | null = null,
): Promise<WeeklyBrief | null> {
  const cacheKey = `${expertiseId}-W${weekNumber}`;
  const cached = CACHE.get(cacheKey);
  if (cached) return cached;

  try {
    const userPrompt = buildUserPrompt(expertiseId, weekNumber, weekTheme);
    const response = await coachChat(
      [{ role: "user", content: userPrompt }],
      { mode: "strategique", maxTokens: MAX_TOKENS, temperature: 0.5 },
    );
    const parsed = extractJsonObject(response.content);
    const focus = weekTheme ?? WEEK_LABELS[weekNumber];
    const brief = validateBrief(parsed, expertiseId, weekNumber, focus);
    CACHE.set(cacheKey, brief);
    return brief;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[weekly-brief-generator] RAG failed for ${cacheKey}, falling back: ${message}`,
    );
    const fallback = WEEKLY_BRIEFS.find(
      (b) => b.painRatioId === expertiseId && b.weekNumber === weekNumber,
    );
    return fallback ?? null;
  }
}
