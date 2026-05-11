/**
 * plan-30j-generator — génération RAG du plan 30j conseiller (sous-PR Coach-1).
 *
 * Stratégie : refactor in-place avec fallback silencieux.
 * - Appelle coachChat() avec system prompt enrichi (retrieval + doctrine + concepts)
 * - User prompt structuré : pain point + agent profile + format JSON attendu
 * - Parse + validation du JSON output
 * - Si fail (timeout, parsing, structure invalide) : fallback sur generatePlan30j() hardcoded
 *
 * Compatible avec la shape GeneratedPlan30j existante : aucun changement
 * breaking pour les 18+ consumers. Plus de richesse dans `focus`, `actions[].label`
 * et `exercice` (champs existants mais peu peuplés en mode hardcoded).
 */

import { coachChat } from "@/lib/server/coach-rag/openrouter-chat";
import type { PainPointResult } from "@/lib/pain-point-detector";
import {
  generatePlan30j as generatePlan30jHardcoded,
  type GeneratedPlan30j,
} from "@/lib/plan-30-jours";
import type { Plan30jWeek } from "@/config/coaching";
import type { ThresholdContext } from "@/lib/diagnostic/resolve-threshold";

interface LlmActionShape {
  label?: unknown;
}

interface LlmWeekShape {
  week_number?: unknown;
  focus?: unknown;
  actions?: unknown;
  exercice?: unknown;
}

interface LlmPlanShape {
  weeks?: unknown;
}

const MAX_TOKENS = 2400;

/**
 * Construit le user prompt qui demande à Sonnet 4.5 un plan 30j structuré
 * en JSON, basé sur le pain point détecté et le profil agent.
 */
function buildUserPrompt(
  painPoint: PainPointResult,
  ctx: ThresholdContext,
): string {
  const expertise = painPoint.expertise;
  return [
    `Génère un plan 30 jours pour un conseiller immobilier qui doit améliorer son ratio "${expertise.label}".`,
    "",
    "CONTEXTE :",
    `- Ratio actuel : ${painPoint.currentValue} (cible ${painPoint.targetValue.toFixed(1)}, direction ${expertise.direction})`,
    `- Profil : ${ctx.seniority} | Statut : ${ctx.agentStatus ?? "—"} | Taille équipe : ${ctx.teamSizeBucket} | Commission moyenne : ${ctx.avgCommissionEur}€`,
    `- Diagnostic : ${expertise.diagnosis}`,
    `- Première action de référence : ${expertise.firstAction}`,
    "",
    "STRUCTURE ATTENDUE : 4 semaines progressives.",
    "- Semaine 1 (Diagnostic) : prise de conscience + premier réflexe quotidien",
    "- Semaine 2 (Ancrage) : adoption des meilleures pratiques",
    "- Semaine 3 (Mise en pratique) : application intensive + ajustements",
    "- Semaine 4 (Consolidation) : mesure + automatisme + préparation debrief",
    "",
    "RÈGLES :",
    "- Exactement 3 actions par semaine (12 actions total).",
    "- Chaque action : 1 phrase actionnable au quotidien, pas plus de 25 mots.",
    "- Utilise le tutoiement direct, ton terrain, pas de théorie.",
    "- Cite des concepts signature NXT si pertinent (en gras dans le markdown).",
    "- Inspire-toi des chunks et synthèses du corpus injecté ci-dessus, sans les paraphraser à l'identique.",
    "- focus = libellé court de la semaine en majuscules (ex: \"QUALIFIER AVANT DE CONTACTER\").",
    "- exercice = exercice/dare hebdo concret de 1 ligne.",
    "",
    "FORMAT DE RÉPONSE — JSON strict, aucun texte hors de l'objet :",
    `{
  "weeks": [
    {
      "week_number": 1,
      "focus": "...",
      "actions": [
        { "label": "..." },
        { "label": "..." },
        { "label": "..." }
      ],
      "exercice": "..."
    },
    { "week_number": 2, ... },
    { "week_number": 3, ... },
    { "week_number": 4, ... }
  ]
}`,
  ].join("\n");
}

/**
 * Extrait l'objet JSON valide d'une réponse LLM qui peut être encadrée par
 * du markdown (```json ... ```), du préambule, etc.
 */
function extractJsonObject(content: string): unknown {
  // 1. Tente parse direct
  try {
    return JSON.parse(content);
  } catch {
    /* fallthrough */
  }
  // 2. Tente extraction depuis ```json ... ```
  const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* fallthrough */
    }
  }
  // 3. Tente extraction de la première accolade au dernier match
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

/**
 * Valide + normalise un objet brut en Plan30jWeek[]. Throws si invalide.
 */
function validateWeeks(raw: unknown): Plan30jWeek[] {
  const obj = raw as LlmPlanShape;
  if (!obj || !Array.isArray(obj.weeks)) {
    throw new Error("LLM output missing weeks array");
  }
  const rawWeeks = obj.weeks as LlmWeekShape[];
  if (rawWeeks.length !== 4) {
    throw new Error(`LLM output must have exactly 4 weeks, got ${rawWeeks.length}`);
  }

  const weeks: Plan30jWeek[] = [];
  for (let i = 0; i < 4; i += 1) {
    const w = rawWeeks[i];
    const weekNumber = typeof w.week_number === "number" ? w.week_number : i + 1;
    if (weekNumber !== 1 && weekNumber !== 2 && weekNumber !== 3 && weekNumber !== 4) {
      throw new Error(`Invalid week_number ${weekNumber}`);
    }
    const focus = typeof w.focus === "string" && w.focus.trim().length > 0
      ? w.focus.trim()
      : `Semaine ${weekNumber}`;
    const exercice = typeof w.exercice === "string" ? w.exercice.trim() : undefined;
    if (!Array.isArray(w.actions)) {
      throw new Error(`Week ${weekNumber} missing actions array`);
    }
    const rawActions = w.actions as LlmActionShape[];
    if (rawActions.length === 0) {
      throw new Error(`Week ${weekNumber} has empty actions`);
    }
    // Tolère 2-4 actions ; tronque à 3 max, complète si manquant (jamais ici)
    const actions = rawActions
      .slice(0, 3)
      .map((a, idx) => {
        const label = typeof a.label === "string" ? a.label.trim() : "";
        if (label.length === 0) throw new Error(`Week ${weekNumber} action ${idx} empty`);
        return {
          id: `w${weekNumber}-action-${idx + 1}`,
          label,
          done: false,
        };
      });

    weeks.push({
      week_number: weekNumber as 1 | 2 | 3 | 4,
      focus,
      actions,
      exercice,
    });
  }
  return weeks;
}

/**
 * Génère un plan 30j enrichi par RAG.
 * - Appelle coachChat() avec system enrichi + user JSON-structured
 * - Parse + valide la réponse
 * - Retourne GeneratedPlan30j (shape compatible legacy)
 *
 * Fallback silencieux vers generatePlan30jHardcoded() si :
 * - OpenRouter timeout/erreur
 * - JSON invalide
 * - Structure 4×3 non respectée
 * - Tout autre erreur runtime
 *
 * Logue serveur pour monitoring (console.error).
 */
export async function generatePlan30jRag(
  painPoint: PainPointResult,
  ctx: ThresholdContext,
): Promise<GeneratedPlan30j> {
  const expertise = painPoint.expertise;

  try {
    const userPrompt = buildUserPrompt(painPoint, ctx);
    const response = await coachChat(
      [{ role: "user", content: userPrompt }],
      {
        mode: "strategique",
        maxTokens: MAX_TOKENS,
        temperature: 0.5,
      },
    );

    const parsed = extractJsonObject(response.content);
    const weeks = validateWeeks(parsed);

    return {
      painRatioId: painPoint.expertiseId,
      painScore: painPoint.painScore,
      estimatedCaLossEur: painPoint.estimatedCaLossEur,
      weeks,
      diagnosis: expertise.diagnosis,
      bestPractices: expertise.bestPractices,
      expectedImpactDelayDays: expertise.expectedImpactDelayDays,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[plan-30j-generator] RAG generation failed, falling back to hardcoded: ${message}`,
    );
    return generatePlan30jHardcoded(painPoint);
  }
}
