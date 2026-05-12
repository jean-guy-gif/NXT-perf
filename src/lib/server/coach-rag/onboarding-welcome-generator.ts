/**
 * onboarding-welcome-generator — sous-PR Coach-11.
 *
 * Génère un message de bienvenue personnalisé du Coach NXT à afficher sur
 * la dernière étape d'onboarding (GPS). Personnalisé au profil saisi :
 *   - category : junior / confirme / expert
 *   - agentStatus : salarie / agent_commercial / mandataire (optionnel)
 *   - firstName : pour citation directe
 *
 * Cache in-memory par (category, agentStatus, profileType). Fallback null.
 *
 * Tonalité : ton Tedesco terrain, accueil chaleureux mais pas guimauve,
 * pose 1 question ouverte pour démarrer l'engagement.
 */

import { coachChat } from "@/lib/server/coach-rag/openrouter-chat";

export interface OnboardingWelcomeInput {
  firstName: string;
  category: "debutant" | "confirme" | "expert";
  agentStatus?: "salarie" | "agent_commercial" | "mandataire" | null;
  profileType?: "AGENT" | "MANAGER" | "INSTITUTION" | "COACH" | "RESEAU" | null;
}

export interface OnboardingWelcomeOutput {
  /** Titre court accrocheur (5-8 mots). */
  title: string;
  /** 2-3 phrases d'accueil personnalisées au profil. */
  welcomeMessage: string;
  /** 3 bullets : ce que le coach NXT promet de faire pour le user. */
  promise: string[];
  /** 1 question ouverte pour démarrer l'engagement (méthode NXT). */
  openingQuestion: string;
}

interface LlmShape {
  title?: unknown;
  welcomeMessage?: unknown;
  promise?: unknown;
  openingQuestion?: unknown;
}

const CACHE = new Map<string, OnboardingWelcomeOutput>();
const MAX_TOKENS = 700;

const CATEGORY_LABELS = {
  debutant: "Junior",
  confirme: "Confirmé",
  expert: "Expert",
} as const;

const STATUS_LABELS = {
  salarie: "salarié",
  agent_commercial: "agent commercial",
  mandataire: "mandataire indépendant",
} as const;

function buildUserPrompt(input: OnboardingWelcomeInput): string {
  const categoryLabel = CATEGORY_LABELS[input.category];
  const statusLabel = input.agentStatus
    ? STATUS_LABELS[input.agentStatus]
    : null;
  const profileTypeLine =
    input.profileType === "MANAGER"
      ? "Profil utilisateur : MANAGER (gere une equipe de conseillers)."
      : input.profileType === "INSTITUTION"
        ? "Profil utilisateur : DIRECTEUR D'AGENCE (gere plusieurs equipes)."
        : "Profil utilisateur : CONSEILLER IMMOBILIER.";

  return [
    `Génère un message de BIENVENUE personnalisé du Coach NXT pour ${input.firstName} qui vient de finaliser son onboarding sur NXT Performance.`,
    "",
    profileTypeLine,
    `Profil métier : ${categoryLabel}${statusLabel ? ` (${statusLabel})` : ""}.`,
    "",
    "STRUCTURE ATTENDUE :",
    "1. title : 5-8 mots accrocheurs, cite le prénom, ton coach Tedesco (ex: 'On démarre ensemble Sarah ?')",
    "2. welcomeMessage : 2-3 phrases d'accueil. Tutoiement direct. Pas guimauve, pas marketing. Mention son profil métier de manière contextuelle (ex: 'En tant que confirmé, tu as déjà tes réflexes terrain — l'enjeu c'est de structurer.').",
    "3. promise : 3 bullets de ce que le Coach NXT va lui apporter concrètement. Impératif terrain, pas de bullshit motivationnel.",
    "4. openingQuestion : 1 question OUVERTE pour démarrer l'engagement (méthode NXT, privilégier 'qu'est-ce que', 'comment', 'sur quoi').",
    "",
    "RÈGLES :",
    "- Ton Tedesco terrain. Pas de welcome corporatif générique.",
    "- Personnalise selon le profil (junior = appui pédagogique, confirme = structuration, expert = optimisation).",
    "- Inspire-toi du corpus injecté.",
    "- Cite un concept signature NXT en **gras** si pertinent.",
    "- Phrases courtes.",
    "",
    "FORMAT DE RÉPONSE — JSON strict :",
    `{
  "title": "...",
  "welcomeMessage": "...",
  "promise": ["...", "...", "..."],
  "openingQuestion": "..."
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

function validate(raw: unknown): OnboardingWelcomeOutput {
  const obj = raw as LlmShape;
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  if (title.length === 0) throw new Error("missing title");
  const welcomeMessage =
    typeof obj.welcomeMessage === "string" ? obj.welcomeMessage.trim() : "";
  if (welcomeMessage.length === 0) throw new Error("missing welcomeMessage");
  const promise = Array.isArray(obj.promise)
    ? (obj.promise as unknown[])
        .filter(
          (s): s is string => typeof s === "string" && s.trim().length > 0,
        )
        .map((s) => s.trim())
        .slice(0, 4)
    : [];
  if (promise.length < 3) throw new Error(`promise too few: ${promise.length}`);
  const openingQuestion =
    typeof obj.openingQuestion === "string" ? obj.openingQuestion.trim() : "";
  if (openingQuestion.length === 0) throw new Error("missing openingQuestion");
  return { title, welcomeMessage, promise, openingQuestion };
}

export async function generateOnboardingWelcome(
  input: OnboardingWelcomeInput,
): Promise<OnboardingWelcomeOutput | null> {
  // Le prénom n'est PAS dans la cache key (le LLM tolère bien la variation
  // de prénoms). On mutualise par (category, status, profileType).
  const cacheKey = `${input.profileType ?? "AGENT"}-${input.category}-${input.agentStatus ?? "none"}`;
  const cached = CACHE.get(cacheKey);
  if (cached) {
    // Inject le prénom dans le title pour personnaliser le cache.
    return {
      ...cached,
      title: cached.title.replace(/{firstName}/g, input.firstName),
    };
  }

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
      `[onboarding-welcome-generator] RAG failed for ${cacheKey}: ${message}`,
    );
    return null;
  }
}
