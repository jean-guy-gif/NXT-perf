/**
 * Centralized persona configuration — single source of truth.
 *
 * 3 active personas: warrior, sport_coach, kind_coach
 * Default: kind_coach
 *
 * The persona modulates TONE, never business logic.
 * Questions and fields remain identical across all personas.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type PersonaId = "warrior" | "sport_coach" | "kind_coach";

export const PERSONA_IDS: PersonaId[] = ["warrior", "sport_coach", "kind_coach"];
export const DEFAULT_PERSONA: PersonaId = "kind_coach";

export function isValidPersona(value: unknown): value is PersonaId {
  return typeof value === "string" && PERSONA_IDS.includes(value as PersonaId);
}

// ── UI config ────────────────────────────────────────────────────────────────

export interface PersonaConfig {
  id: PersonaId;
  emoji: string;
  label: string;
  description: string;
  example: string;
}

export const PERSONAS: PersonaConfig[] = [
  {
    id: "warrior",
    emoji: "🪖",
    label: "Le Sergent",
    description: "Direct, cadrant, factuel. Phrases courtes.",
    example: "Prospection. Donne-moi tes chiffres.",
  },
  {
    id: "sport_coach",
    emoji: "🏋️",
    label: "Coach sportif",
    description: "Énergique, entraînant, orienté action.",
    example: "On attaque la prospection, donne-moi ton volume !",
  },
  {
    id: "kind_coach",
    emoji: "💙",
    label: "Coach bienveillant",
    description: "Rassurant, encourageant, orienté progression.",
    example: "On regarde ta prospection ensemble.",
  },
];

// ── Voice greetings (welcome screen) ─────────────────────────────────────────

export const PERSONA_GREETINGS: Record<PersonaId, { line1: (name: string) => string; line2: string }> = {
  warrior: {
    line1: (name) => `${name}, bilan de la semaine.`,
    line2: "2 minutes. On y va.",
  },
  sport_coach: {
    line1: (name) => `${name}, c'est l'heure du debrief !`,
    line2: "Ta semaine en 2 min. On envoie.",
  },
  kind_coach: {
    line1: (name) => `${name}, on fait le point ensemble.`,
    line2: "Prends 2 minutes pour regarder ta semaine.",
  },
};

// ── Conversation greetings (voice flow start) ────────────────────────────────

export const CONVERSATION_GREETINGS: Record<PersonaId, (name: string) => string> = {
  warrior: (name) => `${name}. Bilan de la semaine. On y va.`,
  sport_coach: (name) => `${name}, c'est parti ! On fait le point.`,
  kind_coach: (name) => `${name}, on prend 2 minutes pour faire le point ensemble.`,
};

// ── Block amorces (light style variation, same intent) ───────────────────────

export const BLOCK_AMORCES: Record<PersonaId, Record<string, string>> = {
  warrior: {
    Prospection: "Prospection. Donne-moi tes chiffres.",
    Vendeurs: "Vendeurs. Estimations et mandats.",
    Acheteurs: "Acheteurs. Visites et offres.",
    Ventes: "Ventes. Actes signés.",
  },
  sport_coach: {
    Prospection: "On attaque la prospection !",
    Vendeurs: "Aux vendeurs, donne-moi tout !",
    Acheteurs: "Les acheteurs, on y va !",
    Ventes: "Les ventes, on termine fort !",
  },
  kind_coach: {
    Prospection: "On commence par la prospection.",
    Vendeurs: "Passons aux vendeurs.",
    Acheteurs: "Et du côté des acheteurs.",
    Ventes: "Pour finir, les ventes.",
  },
};

// ── Coaching debrief tone instructions (for AI reformulation prompt) ─────────

export const PERSONA_COACHING_TONE: Record<PersonaId, string> = {
  warrior: "Ton direct, sec, cadrant. Phrases courtes. Pas de complaisance. Comme un sergent bienveillant mais exigeant. Jamais agressif.",
  sport_coach: "Ton dynamique, énergique, entraînant. Comme un coach sportif féminin qui pousse à l'action. Célèbre les victoires, challenge les faiblesses.",
  kind_coach: "Ton bienveillant, rassurant, encourageant. Comme un coach féminin chaleureux. Valorise l'effort, guide avec douceur. Jamais de jugement.",
};

// ── Gemini voice mapping (adjustable after listening tests) ──────────────────

export const PERSONA_GEMINI_VOICE: Record<PersonaId, string> = {
  warrior: "Charon",
  sport_coach: "Fenrir",
  kind_coach: "Zephyr",
};

// ── ElevenLabs voice env var mapping ─────────────────────────────────────────

export const PERSONA_ELEVENLABS_ENV: Record<PersonaId, string> = {
  warrior: "ELEVENLABS_WARRIOR_VOICE_ID",
  sport_coach: "ELEVENLABS_SPORT_COACH_VOICE_ID",
  kind_coach: "ELEVENLABS_KIND_COACH_VOICE_ID",
};

// ── coach_voice → PersonaId mapping ──────────────────────────────────────────
// profiles.coach_voice stores "sergent"|"sport"|"bienveillant"
// Persona system uses "warrior"|"sport_coach"|"kind_coach"

const COACH_VOICE_TO_PERSONA: Record<string, PersonaId> = {
  sergent: "warrior",
  sport: "sport_coach",
  bienveillant: "kind_coach",
};

export function coachVoiceToPersona(coachVoice: string | null | undefined): PersonaId {
  if (coachVoice && coachVoice in COACH_VOICE_TO_PERSONA) {
    return COACH_VOICE_TO_PERSONA[coachVoice];
  }
  return DEFAULT_PERSONA;
}

// ── Closing signature ────────────────────────────────────────────────────────

export const COACHING_CLOSING = "tu es meilleur que ce que tu penses, Bonne route";
export const COACHING_BRANDING = "Ce coaching hebdomadaire vous a été offert par NXT Coaching.";
export const COACHING_CTA_LABEL = "Tu veux en savoir plus ?";
export const COACHING_CTA_URL = "/formation";
