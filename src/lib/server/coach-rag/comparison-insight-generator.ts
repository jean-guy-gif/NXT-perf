/**
 * comparison-insight-generator — sous-PR Coach-15.
 *
 * Génère un narratif d'insight Tedesco quand un conseiller se compare à un
 * autre (collègue, profil de référence, top performer). Le narratif :
 *   - cite le plus gros écart spécifique
 *   - relie au levier prioritaire avec voix coach NXT
 *   - propose 1 question ouverte (méthode NXT 71% Q ouvertes)
 *
 * Cache in-memory par (otherLabel, biggestGapAxisId, gapBucket).
 * Fallback null si fail.
 */

import { coachChat } from "@/lib/server/coach-rag/openrouter-chat";

export interface ComparisonInsightInput {
  /** Nom/label de l'entité comparée (ex: "Sophie Lemaire", "Profil Expert"). */
  otherLabel: string;
  /** Axe avec le plus gros écart vs l'autre. */
  biggestGap: {
    /** Identifiant de l'axe (correspond à un ratio expertise quand mapping disponible). */
    axisId: string;
    /** Label humain de l'axe (ex: "% Mandats exclusifs"). */
    label: string;
    /** Valeur du conseiller observé. */
    me: number;
    /** Valeur de l'entité comparée. */
    other: number;
    /** Écart absolu en points (other - me). */
    gap: number;
  };
  /** ExpertiseId mappé si disponible (pour personnaliser le narratif au levier). */
  expertiseId?: string | null;
}

export interface ComparisonInsightOutput {
  /** 2-3 phrases narratif Tedesco contextualisé. */
  narrative: string;
  /** 1 phrase de mise en perspective (pattern observé). */
  keyInsight: string;
  /** 1 question OUVERTE issue de la méthode NXT pour faire prendre conscience. */
  keyQuestion: string;
}

interface LlmShape {
  narrative?: unknown;
  keyInsight?: unknown;
  keyQuestion?: unknown;
}

const CACHE = new Map<string, ComparisonInsightOutput>();
const MAX_TOKENS = 600;

function buildUserPrompt(input: ComparisonInsightInput): string {
  return [
    `Génère un INSIGHT pour un conseiller immobilier qui vient de se comparer à "${input.otherLabel}".`,
    "",
    `DONNÉES DE COMPARAISON :`,
    `- Axe : ${input.biggestGap.label}`,
    `- Lui/elle : ${input.biggestGap.me}`,
    `- ${input.otherLabel} : ${input.biggestGap.other}`,
    `- Écart : ${input.biggestGap.gap} points`,
    input.expertiseId
      ? `- Levier expertise mappé : ${input.expertiseId}`
      : "",
    "",
    "STRUCTURE ATTENDUE :",
    "1. narrative : 2-3 phrases qui mettent en perspective l'écart constaté avec ton terrain Tedesco. Tutoiement direct du coach parlant à l'agent observé. Cite les chiffres exacts.",
    "2. keyInsight : 1 phrase qui révèle le PATTERN sous-jacent (pas juste répéter l'écart). Ex: 'Tu fais 3x plus de visites mais moins d'offres — ça veut dire X'.",
    "3. keyQuestion : 1 question OUVERTE pour faire prendre conscience (méthode NXT, privilégier 'comment', 'qu'est-ce que', 'quel').",
    "",
    "RÈGLES :",
    "- Tutoiement direct, ton terrain.",
    "- Pas de jugement, juste constat + ouverture.",
    "- Cite un concept signature NXT en **gras** si pertinent (filtre revenu, CAB, REV, sandwich, etc.).",
    "- Inspire-toi du corpus injecté (sessions réelles + livre Tedesco).",
    "- Phrases courtes.",
    "",
    "FORMAT DE RÉPONSE — JSON strict :",
    `{
  "narrative": "...",
  "keyInsight": "...",
  "keyQuestion": "..."
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

function validate(raw: unknown): ComparisonInsightOutput {
  const obj = raw as LlmShape;
  const narrative =
    typeof obj.narrative === "string" ? obj.narrative.trim() : "";
  if (narrative.length === 0) throw new Error("missing narrative");
  const keyInsight =
    typeof obj.keyInsight === "string" ? obj.keyInsight.trim() : "";
  if (keyInsight.length === 0) throw new Error("missing keyInsight");
  const keyQuestion =
    typeof obj.keyQuestion === "string" ? obj.keyQuestion.trim() : "";
  if (keyQuestion.length === 0) throw new Error("missing keyQuestion");
  return { narrative, keyInsight, keyQuestion };
}

export async function generateComparisonInsight(
  input: ComparisonInsightInput,
): Promise<ComparisonInsightOutput | null> {
  // Bucket l'écart par tranche de 10pts pour mutualiser le cache.
  const gapBucket = Math.floor(input.biggestGap.gap / 10) * 10;
  const cacheKey = `${input.otherLabel.toLowerCase()}-${input.biggestGap.axisId}-${gapBucket}`;
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
      `[comparison-insight-generator] RAG failed for ${cacheKey}: ${message}`,
    );
    return null;
  }
}
