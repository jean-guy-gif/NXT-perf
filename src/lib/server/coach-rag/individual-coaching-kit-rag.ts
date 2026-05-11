/**
 * individual-coaching-kit-rag — sous-PR Coach-7.
 *
 * Génère un kit de préparation coaching individuel manager via RAG
 * (Sonnet 4.5 + corpus NXT-Coach + doctrine). Structure miroir du
 * buildIndividualCoachingKit() hardcoded (5 sections : Ouverture, Prise
 * de conscience, Travail levier, Engagement, Décision manager).
 *
 * Cache in-memory par (expertiseId, advisor.firstName, donePct). Le
 * cache fait évoluer le kit avec l'avancement du plan sans surcharger
 * OpenRouter. Fallback null si fail.
 */

import { coachChat } from "@/lib/server/coach-rag/openrouter-chat";
import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";
import type { Kit, KitSection } from "@/lib/coaching/team-activation-kit";

export interface IndividualCoachingRagInput {
  firstName: string;
  level?: string;
  expertiseId: ExpertiseRatioId | null;
  metrics?: {
    dayOfPlan: number;
    totalDays: number;
    donePct: number;
    doneActions: number;
    totalActions: number;
    remainingActions: number;
  };
}

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

const STRUCTURE = [
  {
    heading: "Ouverture",
    description:
      "Comment ouvrir la session avec une question ouverte personnalisée. 1 paragraphe court + 2-3 bullets de questions ouvertes signature Tedesco.",
  },
  {
    heading: "Prise de conscience",
    description:
      "Aider le conseiller à voir lui-même le point de blocage. 3-4 bullets : questions d'exploration, miroir, reformulation.",
  },
  {
    heading: "Travail du levier",
    description:
      "Les 3 pratiques terrain à proposer (issues du corpus). 3 bullets impératifs concrets.",
  },
  {
    heading: "Engagement",
    description:
      "Faire formuler 1 action concrète à tester d'ici la prochaine session. 2-3 bullets : technique d'engagement Tedesco.",
  },
  {
    heading: "Décision manager",
    description:
      "Ce que le manager fait APRÈS la session : suivi, validation, rappel. 2-3 bullets opérationnels.",
  },
];

const CACHE = new Map<string, Kit>();
const MAX_TOKENS = 2200;

function buildUserPrompt(input: IndividualCoachingRagInput): string {
  const expertise = input.expertiseId
    ? RATIO_EXPERTISE[input.expertiseId]
    : null;
  const leverLabel = expertise?.label ?? "ce levier";

  const metricsLines: string[] = [];
  if (input.metrics) {
    metricsLines.push("CONTEXTE PLAN 30j :");
    metricsLines.push(
      `- J+${input.metrics.dayOfPlan}/${input.metrics.totalDays} (${input.metrics.donePct}% actions cochées)`,
    );
    metricsLines.push(
      `- ${input.metrics.doneActions}/${input.metrics.totalActions} actions faites · ${input.metrics.remainingActions} restantes`,
    );
  }

  return [
    `Génère le contenu du kit "Préparer mon coaching individuel" pour un MANAGER qui s'apprête à animer un coaching individuel avec ${input.firstName}${input.level ? ` (${input.level})` : ""}.`,
    "",
    expertise
      ? `LEVIER EN FOCUS : "${leverLabel}"`
      : "PAS DE LEVIER SPÉCIFIQUE — cadrage général.",
    expertise ? `Diagnostic : ${expertise.diagnosis}` : "",
    expertise
      ? `Bonnes pratiques de référence : ${expertise.bestPractices.slice(0, 350)}`
      : "",
    "",
    ...metricsLines,
    "",
    "STRUCTURE OBLIGATOIRE — 5 sections dans cet ordre :",
    ...STRUCTURE.map((s, i) => `${i + 1}. "${s.heading}" — ${s.description}`),
    "",
    "RÈGLES :",
    `- Le coaching est animé par le MANAGER pour aider ${input.firstName} — privilégier les QUESTIONS OUVERTES (méthode NXT 71% Q ouvertes).`,
    `- Personnalise les sections en citant ${input.firstName} (prénom) régulièrement.`,
    "- Tutoiement direct du manager parlant à l'agent.",
    "- Cite un concept signature NXT en **gras** si pertinent (filtre revenu, CAB, REV, sandwich, etc.).",
    "- Phrases courtes (max 22 mots par bullet).",
    "- Inspire-toi du corpus injecté (sessions réelles + livre Tedesco).",
    "",
    "FORMAT DE RÉPONSE — JSON strict, aucun texte hors de l'objet :",
    `{
  "title": "Trame coaching individuel — ${input.firstName}",
  "subtitle": "Une trame pour aider ${input.firstName} à...",
  "sections": [
    ${STRUCTURE.map(
      (s) =>
        `{ "heading": "${s.heading}", "paragraph": "...", "bullets": ["...", "..."] }`,
    ).join(",\n    ")}
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

function validate(raw: unknown): Kit {
  const obj = raw as LlmKitShape;
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  if (title.length === 0) throw new Error("missing title");
  const subtitle =
    typeof obj.subtitle === "string" && obj.subtitle.trim().length > 0
      ? obj.subtitle.trim()
      : undefined;

  if (!Array.isArray(obj.sections)) {
    throw new Error("missing sections array");
  }
  const rawSections = obj.sections as LlmSectionShape[];
  if (rawSections.length !== STRUCTURE.length) {
    throw new Error(
      `expected ${STRUCTURE.length} sections, got ${rawSections.length}`,
    );
  }

  const sections: KitSection[] = rawSections.map((s, idx) => {
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
          .slice(0, 5)
      : undefined;
    if (!paragraph && (!bullets || bullets.length === 0)) {
      throw new Error(`section ${idx} empty (no paragraph nor bullets)`);
    }
    return { heading, paragraph, bullets };
  });

  return { title, subtitle, sections };
}

export async function generateIndividualCoachingKitRag(
  input: IndividualCoachingRagInput,
): Promise<Kit | null> {
  const donePctBucket = input.metrics
    ? Math.floor(input.metrics.donePct / 25) * 25
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
    const kit = validate(parsed);
    CACHE.set(cacheKey, kit);
    return kit;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[individual-coaching-kit-rag] RAG failed for ${cacheKey}: ${message}`,
    );
    return null;
  }
}
