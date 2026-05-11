/**
 * gamma-kit-rag — génération RAG du contenu Kit pour présentations Gamma (sous-PR Coach-3).
 *
 * Stratégie : refactor in-place avec fallback silencieux.
 * - Appelle coachChat() avec prompt structuré JSON spécifique au kitKind
 *   (meeting / practice / weekly).
 * - Parse + validation de la shape Kit (title, subtitle, sections[]).
 * - Cache in-memory par (kitKind, expertiseId).
 * - Si fail (timeout, parsing, structure invalide) : retourne null. Caller
 *   utilise buildKit() hardcoded en fallback.
 *
 * Le contexte équipe (numbers, refAdvisor) est passé optionnellement au LLM
 * pour qu'il puisse contextualiser les bullets (le LLM ne RECRÉE pas les
 * nombres — c'est le builder Gamma qui les injecte en label/value forcé).
 */

import { coachChat } from "@/lib/server/coach-rag/openrouter-chat";
import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";
import type { Kit, KitKind } from "@/lib/coaching/team-activation-kit";
import type { TeamKitContext } from "@/types/gamma";

const CACHE = new Map<string, Kit>();
const MAX_TOKENS = 2400;

interface LlmSectionShape {
  heading?: unknown;
  paragraph?: unknown;
  bullets?: unknown;
}

interface LlmKitShape {
  title?: unknown;
  subtitle?: unknown;
  sections?: unknown;
}

const MEETING_STRUCTURE = [
  { heading: "Constat équipe", min: 3, max: 3, paragraphOk: false },
  { heading: "Pourquoi ce levier est prioritaire", min: 3, max: 3, paragraphOk: false },
  { heading: "3 actions à appliquer cette semaine", min: 3, max: 3, paragraphOk: false },
  { heading: "Engagement demandé à chaque conseiller", min: 3, max: 3, paragraphOk: false },
  { heading: "Conclusion", min: 3, max: 3, paragraphOk: false },
];

const PRACTICE_STRUCTURE = [
  { heading: "Durée recommandée", min: 0, max: 0, paragraphOk: true },
  { heading: "Exercice 1 — Jeu de rôle", min: 3, max: 4, paragraphOk: false },
  { heading: "Exercice 2 — Analyse d'un cas réel", min: 3, max: 4, paragraphOk: false },
  { heading: "Exercice 3 — Reformulation collective", min: 3, max: 4, paragraphOk: false },
  { heading: "Débrief collectif", min: 3, max: 4, paragraphOk: false },
];

const WEEKLY_STRUCTURE = [
  { heading: "Point 1 — Ce qui a été testé cette semaine", min: 3, max: 4, paragraphOk: false },
  { heading: "Point 2 — Ce qui a coincé", min: 3, max: 4, paragraphOk: false },
  { heading: "Point 3 — Ce qui a marché", min: 3, max: 4, paragraphOk: false },
  { heading: "Point 4 — Engagements pour la semaine suivante", min: 3, max: 4, paragraphOk: false },
];

const KIT_STRUCTURE: Record<KitKind, typeof MEETING_STRUCTURE> = {
  meeting: MEETING_STRUCTURE,
  practice: PRACTICE_STRUCTURE,
  weekly: WEEKLY_STRUCTURE,
};

const KIT_INTRO: Record<KitKind, string> = {
  meeting:
    "BRIEF équipe à animer en réunion (15-30 min). Ton MANAGER, motivant, factuel.",
  practice:
    "MISE EN PRATIQUE TERRAIN 60-90 min avec exercices structurés. Ton COACH, opérationnel.",
  weekly:
    "4 POINTS HEBDOMADAIRES de pilotage manager. Ton SUIVI, factuel, orienté action.",
};

function buildUserPrompt(
  kitKind: KitKind,
  expertiseId: ExpertiseRatioId,
  context?: TeamKitContext,
): string {
  const expertise = RATIO_EXPERTISE[expertiseId];
  const structure = KIT_STRUCTURE[kitKind];

  const contextLines: string[] = [];
  if (context) {
    if (context.indicatorLabel) {
      contextLines.push(`- Indicateur cible : ${context.indicatorLabel}`);
    }
    if (context.rhythmStatus) {
      contextLines.push(`- Statut rythme équipe : ${context.rhythmStatus}`);
    }
    if (context.refAdvisor?.name) {
      contextLines.push(
        `- Conseiller référent identifié : ${context.refAdvisor.name}${context.refAdvisor.levelLabel ? ` (${context.refAdvisor.levelLabel})` : ""}`,
      );
    }
  }

  return [
    `Génère le contenu d'un kit ${kitKind.toUpperCase()} prêt-à-présenter sur le levier "${expertise.label}".`,
    "",
    KIT_INTRO[kitKind],
    "",
    "CONTEXTE LEVIER :",
    `- Diagnostic : ${expertise.diagnosis}`,
    `- Bonnes pratiques de référence : ${expertise.bestPractices.slice(0, 350)}`,
    `- Première action concrète : ${expertise.firstAction}`,
    "",
    contextLines.length > 0 ? "CONTEXTE ÉQUIPE :" : "",
    ...contextLines,
    "",
    "STRUCTURE OBLIGATOIRE — exactement ces sections dans cet ordre :",
    ...structure.map(
      (s, i) =>
        `${i + 1}. "${s.heading}" — ${s.paragraphOk ? "1 paragraphe court (2-3 phrases)" : `${s.min}-${s.max} bullets terrain`}`,
    ),
    "",
    "RÈGLES RÉDACTIONNELLES :",
    "- Tutoiement direct (manager → équipe), ton terrain pragmatique, pas de théorie.",
    "- Voix MANAGER : impératif d'animation ('Mettre en place', 'Faire travailler', 'Convoquer', 'Suivre').",
    "- Inspire-toi du corpus injecté (sessions réelles + livre Tedesco + concepts signature).",
    "- Cite un concept signature NXT en **gras** si pertinent.",
    "- Pas plus de 25 mots par bullet.",
    "- N'inclus PAS les nombres équipe (réalisé, écart, etc.) dans tes bullets — ils seront injectés par le builder en label/value forcé.",
    "",
    "FORMAT DE RÉPONSE — JSON strict, aucun texte hors de l'objet :",
    `{
  "title": "${kitKind === "meeting" ? "Réunion équipe" : kitKind === "practice" ? "Mise en pratique" : "4 points hebdo"} — ${expertise.label}",
  "subtitle": "...",
  "sections": [
    ${structure
      .map(
        (s) =>
          `{ "heading": "${s.heading}", ${s.paragraphOk ? '"paragraph": "..."' : '"bullets": ["...", "...", "..."]'} }`,
      )
      .join(",\n    ")}
  ]
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

function validateKit(raw: unknown, kitKind: KitKind): Kit {
  const obj = raw as LlmKitShape;
  const title = typeof obj.title === "string" && obj.title.trim().length > 0
    ? obj.title.trim()
    : "";
  if (title.length === 0) throw new Error("missing title");

  const subtitle =
    typeof obj.subtitle === "string" && obj.subtitle.trim().length > 0
      ? obj.subtitle.trim()
      : undefined;

  if (!Array.isArray(obj.sections)) {
    throw new Error("missing sections array");
  }
  const expectedStructure = KIT_STRUCTURE[kitKind];
  if (obj.sections.length !== expectedStructure.length) {
    throw new Error(
      `expected ${expectedStructure.length} sections, got ${obj.sections.length}`,
    );
  }

  const sections = (obj.sections as LlmSectionShape[]).map((s, idx) => {
    const heading = typeof s.heading === "string" ? s.heading.trim() : "";
    if (heading.length === 0) throw new Error(`section ${idx} missing heading`);

    const paragraph =
      typeof s.paragraph === "string" && s.paragraph.trim().length > 0
        ? s.paragraph.trim()
        : undefined;

    const bullets = Array.isArray(s.bullets)
      ? (s.bullets as unknown[])
          .filter(
            (b): b is string => typeof b === "string" && b.trim().length > 0,
          )
          .map((b) => b.trim())
      : undefined;

    const structureSpec = expectedStructure[idx];
    if (structureSpec.paragraphOk) {
      if (!paragraph)
        throw new Error(`section ${idx} expected paragraph`);
    } else {
      if (!bullets || bullets.length < structureSpec.min) {
        throw new Error(
          `section ${idx} expected ${structureSpec.min} bullets, got ${bullets?.length ?? 0}`,
        );
      }
    }

    return { heading, paragraph, bullets: bullets?.slice(0, structureSpec.max) };
  });

  return { title, subtitle, sections };
}

/**
 * Génère un Kit (meeting/practice/weekly) enrichi par RAG.
 *
 * Retourne `null` si fail (timeout, JSON invalide, structure incorrecte).
 * Le caller utilise alors `buildKit()` hardcoded en fallback.
 *
 * Cache in-memory partagé par (kitKind, expertiseId) — perdu au reboot
 * process. Context optionnel n'est PAS clé de cache (le LLM tolère bien
 * la variation de numbers — le builder Gamma injecte les valeurs réelles
 * en post-traitement).
 */
export async function generateKitRag(
  kitKind: KitKind,
  expertiseId: ExpertiseRatioId,
  context?: TeamKitContext,
): Promise<Kit | null> {
  const cacheKey = `${kitKind}-${expertiseId}`;
  const cached = CACHE.get(cacheKey);
  if (cached) return cached;

  try {
    const userPrompt = buildUserPrompt(kitKind, expertiseId, context);
    const response = await coachChat(
      [{ role: "user", content: userPrompt }],
      { mode: "strategique", maxTokens: MAX_TOKENS, temperature: 0.5 },
    );
    const parsed = extractJsonObject(response.content);
    const kit = validateKit(parsed, kitKind);
    CACHE.set(cacheKey, kit);
    return kit;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[gamma-kit-rag] RAG failed for ${cacheKey}, falling back to hardcoded: ${message}`,
    );
    return null;
  }
}
