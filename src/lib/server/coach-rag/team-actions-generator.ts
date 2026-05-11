/**
 * team-actions-generator — 3 actions équipe enrichies via RAG (sous-PR Coach-2a).
 *
 * Stratégie : refactor in-place avec fallback silencieux.
 * - Appelle coachChat() avec prompt structuré demandant 3 actions "voix manager"
 *   (impératif : "Mettre en place...", "Faire travailler...", "Suivre...")
 * - Parse JSON output + validation 3 strings non vides
 * - Fallback silencieux sur TEAM_ACTIONS hardcoded (cf. lib/coaching/team-actions.ts)
 *
 * Cache in-memory simple par expertiseId (TTL session).
 */

import { coachChat } from "@/lib/server/coach-rag/openrouter-chat";
import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";
import { getTeamActions as getTeamActionsHardcoded } from "@/lib/coaching/coach-brain";

const CACHE = new Map<string, string[]>();
const MAX_TOKENS = 800;

interface LlmShape {
  actions?: unknown;
}

function buildUserPrompt(expertiseId: ExpertiseRatioId): string {
  const expertise = RATIO_EXPERTISE[expertiseId];
  return [
    `Génère les 3 actions d'animation équipe pour un MANAGER qui veut faire progresser son équipe sur le levier "${expertise.label}".`,
    "",
    `Diagnostic du levier : ${expertise.diagnosis}`,
    `Bonnes pratiques de référence : ${expertise.bestPractices.slice(0, 400)}`,
    "",
    "VOIX ATTENDUE : voix MANAGER (impératif, animation équipe), pas voix conseiller.",
    "Commence chaque action par un verbe d'action manager :",
    "- 'Mettre en place...'",
    "- 'Faire travailler...'",
    "- 'Suivre...'",
    "- 'Animer...'",
    "- 'Organiser...'",
    "- 'Co-prospecter...'",
    "",
    "RÈGLES :",
    "- Exactement 3 actions, dans cet ordre (mise en place / animation / suivi).",
    "- Chaque action : 1 phrase actionnable, 25 mots max, ton terrain manager.",
    "- Inspire-toi du corpus injecté ci-dessus (sessions réelles + livre Tedesco).",
    "- Cite un concept signature NXT si pertinent.",
    "",
    "FORMAT DE RÉPONSE — JSON strict :",
    `{
  "actions": [
    "Mettre en place ...",
    "Faire travailler ...",
    "Suivre ..."
  ]
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

function validateActions(raw: unknown): string[] {
  const obj = raw as LlmShape;
  if (!obj || !Array.isArray(obj.actions)) {
    throw new Error("LLM output missing actions array");
  }
  const filtered = (obj.actions as unknown[])
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim());
  if (filtered.length < 3) {
    throw new Error(`Expected 3 actions, got ${filtered.length}`);
  }
  return filtered.slice(0, 3);
}

/**
 * Récupère ou génère via RAG les 3 actions équipe pour un levier.
 *
 * Fallback : si RAG fail (timeout, parsing, structure invalide), retourne
 * les actions hardcodées via `getTeamActions(expertiseId, 3)` de la façade
 * coach-brain (qui cascade TEAM_ACTIONS → fallback TOP_PRACTICES si absent).
 */
export async function getOrGenerateTeamActions(
  expertiseId: ExpertiseRatioId,
): Promise<string[]> {
  const cached = CACHE.get(expertiseId);
  if (cached) return cached;

  try {
    const userPrompt = buildUserPrompt(expertiseId);
    const response = await coachChat(
      [{ role: "user", content: userPrompt }],
      { mode: "strategique", maxTokens: MAX_TOKENS, temperature: 0.4 },
    );
    const parsed = extractJsonObject(response.content);
    const actions = validateActions(parsed);
    CACHE.set(expertiseId, actions);
    return actions;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[team-actions-generator] RAG failed for ${expertiseId}, falling back to hardcoded: ${message}`,
    );
    return getTeamActionsHardcoded(expertiseId, 3);
  }
}
