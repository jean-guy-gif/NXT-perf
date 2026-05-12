/**
 * post-saisie-tip-generator — sous-PR Coach-14.
 *
 * Génère un "coup d'œil Coach NXT" qui s'affiche en haut du CoachingDebrief
 * après une saisie hebdo. Différent du debrief complet : focalisé sur UNE
 * observation forte + UNE micro-action concrète pour la semaine prochaine.
 *
 * Identifie le verdict le plus marquant entre :
 *   - Plus grosse baisse week-over-week
 *   - Plus grosse réussite week-over-week
 *   - Ratio dégradé qui n'a pas bougé
 *   - Volume saisi exceptionnellement faible
 *
 * Cache in-memory par (profile, volumeScore bucket, perfScore bucket).
 * Fallback null.
 */

import { coachChat } from "@/lib/server/coach-rag/openrouter-chat";

export interface PostSaisieTipInput {
  /** Profile saisi : junior / confirme / expert / insufficient_data */
  profile: string;
  /** Score volume 0-100. */
  volumeScore: number;
  /** Score performance 0-100. */
  performanceScore: number;
  /** Score composite 0-100. */
  compositeScore: number;
  /** Top 1-3 points de vigilance détectés localement. */
  watchouts: string[];
  /** Top 1-3 points forts détectés localement. */
  strengths: string[];
  /** Délta sur les ratios clés depuis la semaine dernière (optionnel). */
  weekOverWeekDeltas?: Array<{
    label: string;
    deltaPoints: number;
  }>;
}

export interface PostSaisieTipOutput {
  /** 1 phrase percutante (observation Tedesco — pas générique). */
  microInsight: string;
  /** 1 micro-action TERRAIN pour la semaine prochaine, impératif court. */
  microAction: string;
  /** 1 phrase Tedesco qui explique pourquoi cette action est critique. */
  whyItMatters: string;
  /** Tonalité visuelle : positive (vert) / focus (indigo) / concern (orange). */
  mood: "positive" | "focus" | "concern";
}

interface LlmShape {
  microInsight?: unknown;
  microAction?: unknown;
  whyItMatters?: unknown;
  mood?: unknown;
}

const CACHE = new Map<string, PostSaisieTipOutput>();
const MAX_TOKENS = 600;

function buildUserPrompt(input: PostSaisieTipInput): string {
  const wowLines: string[] = [];
  if (input.weekOverWeekDeltas && input.weekOverWeekDeltas.length > 0) {
    wowLines.push("Évolution week-over-week :");
    for (const d of input.weekOverWeekDeltas) {
      const sign = d.deltaPoints >= 0 ? "+" : "";
      wowLines.push(`  - ${d.label} : ${sign}${d.deltaPoints} pts`);
    }
  }

  return [
    `Un conseiller immobilier vient de saisir ses résultats hebdomadaires. Génère son "coup d'œil Coach NXT" : UNE observation marquante + UNE micro-action concrète pour la semaine prochaine.`,
    "",
    "DONNÉES DE LA SAISIE :",
    `- Profil : ${input.profile}`,
    `- Score volume : ${input.volumeScore}/100`,
    `- Score performance : ${input.performanceScore}/100`,
    `- Score global : ${input.compositeScore}/100`,
    `- Points forts détectés : ${input.strengths.join(" | ") || "aucun"}`,
    `- Points de vigilance : ${input.watchouts.join(" | ") || "aucun"}`,
    ...wowLines,
    "",
    "STRUCTURE ATTENDUE — focus sur 1 SEULE chose marquante (la plus signifiante) :",
    "1. microInsight : 1 phrase courte (max 20 mots) avec un FAIT précis tiré des données. Pas générique.",
    "2. microAction : 1 micro-action terrain à faire DEMAIN ou cette semaine. Impératif, max 15 mots. Pas de 'tu peux essayer de'.",
    "3. whyItMatters : 1 phrase Tedesco qui dit POURQUOI c'est critique. Ton terrain, sans bullshit motivationnel.",
    "4. mood : 'positive' (vert) si gros point fort à célébrer, 'focus' (indigo) si action ciblée standard, 'concern' (orange) si vraie alerte.",
    "",
    "RÈGLES :",
    "- Tutoiement direct, ton Tedesco.",
    "- Ne PAS faire un debrief complet — focus sur LA chose qui compte le plus cette semaine.",
    "- Inspire-toi du corpus injecté.",
    "- Cite un concept signature NXT en **gras** si pertinent.",
    "",
    "FORMAT DE RÉPONSE — JSON strict :",
    `{
  "microInsight": "...",
  "microAction": "...",
  "whyItMatters": "...",
  "mood": "focus"
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

function validate(raw: unknown): PostSaisieTipOutput {
  const obj = raw as LlmShape;
  const microInsight =
    typeof obj.microInsight === "string" ? obj.microInsight.trim() : "";
  if (microInsight.length === 0) throw new Error("missing microInsight");
  const microAction =
    typeof obj.microAction === "string" ? obj.microAction.trim() : "";
  if (microAction.length === 0) throw new Error("missing microAction");
  const whyItMatters =
    typeof obj.whyItMatters === "string" ? obj.whyItMatters.trim() : "";
  if (whyItMatters.length === 0) throw new Error("missing whyItMatters");
  const moodRaw = typeof obj.mood === "string" ? obj.mood.trim() : "focus";
  const mood: PostSaisieTipOutput["mood"] =
    moodRaw === "positive" || moodRaw === "concern" ? moodRaw : "focus";
  return { microInsight, microAction, whyItMatters, mood };
}

export async function generatePostSaisieTip(
  input: PostSaisieTipInput,
): Promise<PostSaisieTipOutput | null> {
  // Bucket scores par tranche de 10 pour mutualiser cache.
  const vBucket = Math.floor(input.volumeScore / 10) * 10;
  const pBucket = Math.floor(input.performanceScore / 10) * 10;
  const cacheKey = `${input.profile}-v${vBucket}-p${pBucket}`;
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
      `[post-saisie-tip-generator] RAG failed for ${cacheKey}: ${message}`,
    );
    return null;
  }
}
