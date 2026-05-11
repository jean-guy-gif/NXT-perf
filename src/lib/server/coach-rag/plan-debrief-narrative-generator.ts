/**
 * plan-debrief-narrative-generator — sous-PR Coach-6.
 *
 * Génère un narratif J+30 fin de plan 30j enrichi par RAG (Sonnet 4.5 +
 * corpus NXT-Coach + doctrine). S'appuie sur la PlanDebriefResult
 * structurée calculée localement par computePlanDebrief() (numbers exacts),
 * et ajoute une couche narrative voix Tedesco.
 *
 * Cache in-memory par (planId). Le narratif ne change pas tant qu'on ne
 * touche pas au plan — chaque debrief = 1 appel RAG max par session.
 *
 * Fallback : retourne `null` si fail. Le caller affiche alors les sections
 * structurées sans le layer narratif.
 */

import { coachChat } from "@/lib/server/coach-rag/openrouter-chat";
import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";

export interface PlanDebriefNarrativeInput {
  planId: string;
  painRatioId: ExpertiseRatioId;
  ratioBaseline: number;
  ratioCurrent: number;
  ratioDeltaPoints: number;
  isImproving: boolean;
  actionsDone: number;
  actionsTotal: number;
  percentDone: number;
  weeksWithSaisie: number;
  monthlyGainEur: number;
  annualProjectedEur: number;
  /** Labels des actions cochées (max ~12). Permet au LLM de citer ce qui
   * a marché. Optionnel — si absent le narratif reste générique. */
  doneActionLabels: string[];
  /** Labels des actions NON cochées. Permet au LLM d'identifier les vraies
   * difficultés terrain. */
  pendingActionLabels: string[];
}

export interface PlanDebriefNarrativeOutput {
  intro: string;
  whatWorked: string[];
  whatToImprove: string[];
  nextStep: string[];
  comparisonCorpus: string;
}

interface LlmShape {
  intro?: unknown;
  whatWorked?: unknown;
  whatToImprove?: unknown;
  nextStep?: unknown;
  comparisonCorpus?: unknown;
}

const CACHE = new Map<string, PlanDebriefNarrativeOutput>();
const MAX_TOKENS = 1800;

function buildUserPrompt(input: PlanDebriefNarrativeInput): string {
  const expertise = RATIO_EXPERTISE[input.painRatioId];
  return [
    `Génère un debrief J+30 de fin de plan 30j pour un conseiller immobilier qui a travaillé le levier "${expertise.label}".`,
    "",
    "DONNÉES BRUTES (ne pas inventer, ne pas contredire) :",
    `- Actions cochées : ${input.actionsDone}/${input.actionsTotal} (${input.percentDone}%)`,
    `- Saisies hebdo pendant le plan : ${input.weeksWithSaisie}/4`,
    `- Ratio baseline (avant plan) : ${input.ratioBaseline}`,
    `- Ratio actuel : ${input.ratioCurrent}`,
    `- Delta : ${input.ratioDeltaPoints >= 0 ? "+" : ""}${input.ratioDeltaPoints} pts`,
    `- En progression : ${input.isImproving ? "OUI" : "NON"}`,
    `- Gain mensuel estimé : ${Math.round(input.monthlyGainEur)}€`,
    `- Gain annuel projeté : ${Math.round(input.annualProjectedEur)}€`,
    "",
    "ACTIONS COCHÉES PAR L'AGENT :",
    ...input.doneActionLabels.slice(0, 12).map((l) => `  ✓ ${l}`),
    "",
    "ACTIONS NON COCHÉES (difficultés terrain) :",
    ...input.pendingActionLabels.slice(0, 8).map((l) => `  ✗ ${l}`),
    "",
    "STRUCTURE ATTENDUE :",
    "1. intro : 2-3 phrases — un résumé personnalisé du parcours 30j. Ton terrain Tedesco, tutoiement, sans bullshit. Cite UN fait précis (ex: '17 actions cochées sur 24, c'est solide').",
    "2. whatWorked : 3-4 bullets — ce qui a marché. CITE les actions cochées spécifiques + impact mesurable.",
    "3. whatToImprove : 3-4 bullets — les difficultés (issues des actions non cochées). Ton bienveillant mais direct. PAS de jugement, juste constat factuel.",
    "4. nextStep : 3 actions concrètes pour le prochain 30j sur ce même levier OU sur le suivant. Format impératif terrain.",
    "5. comparisonCorpus : 2-3 phrases — ce que font les meilleurs agents sur ce profil (issus du corpus NXT). Cite un concept signature NXT en **gras** si pertinent.",
    "",
    "RÈGLES :",
    "- Tutoiement direct, ton Tedesco.",
    "- Ne JAMAIS inventer un chiffre absent des données ci-dessus.",
    "- Cite des concepts signature NXT en **gras**.",
    "- Phrases courtes (max 20 mots par bullet).",
    "",
    "FORMAT DE RÉPONSE — JSON strict :",
    `{
  "intro": "...",
  "whatWorked": ["...", "..."],
  "whatToImprove": ["...", "..."],
  "nextStep": ["...", "...", "..."],
  "comparisonCorpus": "..."
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

function validate(raw: unknown): PlanDebriefNarrativeOutput {
  const obj = raw as LlmShape;
  const intro = typeof obj.intro === "string" ? obj.intro.trim() : "";
  if (intro.length === 0) throw new Error("missing intro");

  const whatWorked = Array.isArray(obj.whatWorked)
    ? (obj.whatWorked as unknown[])
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim())
        .slice(0, 4)
    : [];
  if (whatWorked.length < 2)
    throw new Error(`whatWorked too few: ${whatWorked.length}`);

  const whatToImprove = Array.isArray(obj.whatToImprove)
    ? (obj.whatToImprove as unknown[])
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim())
        .slice(0, 4)
    : [];
  if (whatToImprove.length < 2)
    throw new Error(`whatToImprove too few: ${whatToImprove.length}`);

  const nextStep = Array.isArray(obj.nextStep)
    ? (obj.nextStep as unknown[])
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim())
        .slice(0, 3)
    : [];
  if (nextStep.length < 2)
    throw new Error(`nextStep too few: ${nextStep.length}`);

  const comparisonCorpus =
    typeof obj.comparisonCorpus === "string"
      ? obj.comparisonCorpus.trim()
      : "";
  if (comparisonCorpus.length === 0) throw new Error("missing comparisonCorpus");

  return { intro, whatWorked, whatToImprove, nextStep, comparisonCorpus };
}

export async function generatePlanDebriefNarrative(
  input: PlanDebriefNarrativeInput,
): Promise<PlanDebriefNarrativeOutput | null> {
  const cached = CACHE.get(input.planId);
  if (cached) return cached;

  try {
    const userPrompt = buildUserPrompt(input);
    const response = await coachChat(
      [{ role: "user", content: userPrompt }],
      { mode: "strategique", maxTokens: MAX_TOKENS, temperature: 0.5 },
    );
    const parsed = extractJsonObject(response.content);
    const result = validate(parsed);
    CACHE.set(input.planId, result);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[plan-debrief-narrative-generator] RAG failed for plan ${input.planId}: ${message}`,
    );
    return null;
  }
}
