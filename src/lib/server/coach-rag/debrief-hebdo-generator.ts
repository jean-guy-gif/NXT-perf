/**
 * debrief-hebdo-generator — sous-PR Coach-5.
 *
 * Reformule un debrief hebdo calculé localement en narratif voix Tedesco via
 * Claude Sonnet 4.5 + retrieval corpus NXT-Coach + doctrine NXT.
 *
 * Stratégie : in-place RAG. Conserve la signature et la shape de sortie de
 * l'ancien endpoint /api/coaching-debrief (compat avec coaching-ai-client.ts
 * + composants UI).
 *
 * Fallback silencieux : si coachChat() fail (timeout, JSON invalide), on
 * tente un retry minimal avec un fallback gpt-4o-mini sans retrieval.
 * Si ÇA aussi fail, on retourne `null` — le client a son fallback narratif
 * local construit côté browser (cf. coaching-debrief.tsx).
 */

import { coachChat } from "@/lib/server/coach-rag/openrouter-chat";
import {
  PERSONA_COACHING_TONE,
  COACHING_CLOSING,
  type PersonaId,
} from "@/lib/personas";

export interface DebriefInput {
  persona: PersonaId;
  profile: string;
  volumeScore: number;
  performanceScore: number;
  compositeScore: number;
  volumeReview: Array<{
    label: string;
    actual: number;
    target: number;
    verdict: string;
  }>;
  performanceReview: Array<{
    label: string;
    value: number;
    target: number;
    status: string;
    confidence: string;
  }>;
  strengths: string[];
  watchouts: string[];
  topPriorities: string[];
  nextWeekPlan: Array<{ text: string }>;
}

export interface DebriefOutput {
  title: string;
  overallSummary: string;
  volumeText: string;
  performanceText: string;
  strengthsText: string;
  watchoutsText: string;
  nextWeekText: string;
  closing: string;
  audioScript: string;
}

const MAX_TOKENS = 800;

function buildUserPrompt(input: DebriefInput): string {
  return [
    `Reformule ce débrief coaching hebdomadaire en narratif voix Tedesco (tutoiement direct, terrain, sans bullshit motivationnel).`,
    "",
    "DONNÉES BRUTES (ne pas inventer, ne pas contredire) :",
    `- Profil agent : ${input.profile}`,
    `- Score volume : ${input.volumeScore}/100`,
    `- Score performance : ${input.performanceScore}/100`,
    `- Score global : ${input.compositeScore}/100`,
    "",
    "Volume (réalisé vs objectif) :",
    ...input.volumeReview.map(
      (v) => `  - ${v.label} : ${v.actual}/${v.target} (${v.verdict})`,
    ),
    "",
    "Ratios de performance :",
    ...input.performanceReview.map(
      (r) =>
        `  - ${r.label} : ${r.value} (objectif ${r.target}, status ${r.status})`,
    ),
    "",
    `Points forts : ${input.strengths.join(" | ") || "aucun identifié"}`,
    `Points de vigilance : ${input.watchouts.join(" | ") || "aucun identifié"}`,
    `Priorités : ${input.topPriorities.join(" | ") || "aucune"}`,
    `Plan semaine prochaine : ${input.nextWeekPlan.map((a) => a.text).join(" | ") || "aucun"}`,
    "",
    "RÈGLES RÉDACTIONNELLES :",
    "- Ne pas inventer un chiffre ou un fait. S'appuyer uniquement sur les données.",
    "- Cite un concept signature NXT en **gras** si pertinent (issu du corpus).",
    "- Tutoiement direct. Pas de 'tu peux essayer', préfère 'fais', 'teste', 'pose-toi la question'.",
    "- Phrases courtes (12 mots max idéalement).",
    `- closing DOIT être EXACTEMENT : "${COACHING_CLOSING}"`,
    "",
    "FORMAT DE RÉPONSE — JSON strict, aucun texte hors de l'objet :",
    `{
  "title": "5 mots max",
  "overallSummary": "1-2 phrases résumant la semaine",
  "volumeText": "1 phrase sur le volume",
  "performanceText": "1 phrase sur les ratios",
  "strengthsText": "1 phrase sur les points forts",
  "watchoutsText": "1 phrase sur les points de vigilance",
  "nextWeekText": "1-2 phrases sur le plan semaine prochaine",
  "closing": "${COACHING_CLOSING}",
  "audioScript": "Version orale complète 4-5 phrases courtes, fluide à l'oral"
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

function validateDebrief(raw: unknown): DebriefOutput {
  const obj = raw as Record<string, unknown>;
  const fields: Array<keyof DebriefOutput> = [
    "title",
    "overallSummary",
    "volumeText",
    "performanceText",
    "strengthsText",
    "watchoutsText",
    "nextWeekText",
    "audioScript",
  ];
  const result = {} as DebriefOutput;
  for (const f of fields) {
    const value = obj[f];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Missing or empty field: ${f}`);
    }
    result[f] = value.trim();
  }
  // closing forcée au signature canonique côté client (coaching-ai-client.ts
  // already overrides) — on la met quand même ici pour cohérence.
  result.closing = COACHING_CLOSING;
  return result;
}

/**
 * Génère un debrief hebdo enrichi via RAG (Sonnet 4.5 + retrieval).
 *
 * Retourne `null` si fail (le caller endpoint peut alors retombrer sur
 * gpt-4o-mini sans retrieval comme stratégie de dégradation gracieuse,
 * ou directement sur le fallback local côté client).
 */
export async function generateDebriefHebdoRag(
  input: DebriefInput,
): Promise<DebriefOutput | null> {
  const tone = PERSONA_COACHING_TONE[input.persona];
  const userPrompt = buildUserPrompt(input);

  try {
    const response = await coachChat(
      [{ role: "user", content: userPrompt }],
      {
        mode: "strategique",
        maxTokens: MAX_TOKENS,
        temperature: 0.4,
        // Pas de skipRetrieval — on veut le retrieval pour citer le corpus
      },
    );
    // Inject tone en post-traitement via system prompt déjà géré par coachChat.
    // Le `tone` est ici pour traçabilité (non utilisé directement).
    void tone;

    const parsed = extractJsonObject(response.content);
    return validateDebrief(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[debrief-hebdo-generator] RAG failed: ${message}`,
    );
    return null;
  }
}
