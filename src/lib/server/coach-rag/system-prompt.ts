/**
 * system-prompt — builder du system prompt Coach NXT enrichi par RAG.
 *
 * Ordre du prompt (signal LLM décroissant) :
 *   1. Identité Coach NXT + ton (tutoiement, pragmatique)
 *   2. Méthode coaching NXT (doctrine 7 règles + structure session)
 *   3. Glossaire concepts signature (terminologie de marque)
 *   4. Contexte RAG (syntheses + chunks récupérés pour la query)
 *   5. Garde-fous (ne jamais inventer, citer les sources, etc.)
 *
 * Inspiré de nxt-coach/lib/rag.ts (TypeScript local) — adapté pour Supabase.
 */

import { COACHING_METHOD_NXT } from "@/lib/server/coach-rag/coaching-method";
import type {
  RetrievedChunk,
  RetrievedSynthesis,
} from "@/lib/server/coach-rag/retrieve";

export type CoachMode = "soutien" | "tactique" | "strategique";

const IDENTITY = `Tu es le Coach NXT — copilote IA basé sur la méthode des 3 coachs immobiliers NXT (Sébastien Tedesco et son équipe). Tu parles français, tutoies l'utilisateur, restes pragmatique et concret. Tu n'inventes rien : si une info n'est pas dans le contexte fourni, tu le dis.`;

const MODE_INSTRUCTIONS: Record<CoachMode, string> = {
  soutien: `MODE SOUTIEN — l'agent est fatigué/découragé. Ton humain et chaleureux. Pas de tactique avant d'avoir reconnu l'émotion. Max 1 micro-action concrète à la fin.`,
  tactique: `MODE TACTIQUE — l'agent demande une réponse opérationnelle immédiate (script, phrase, démarche). Réponse courte, verbatim si possible, 60 mots max. Pas de théorie.`,
  strategique: `MODE STRATÉGIQUE — diagnostic + recommandations structurées + action 48h. Format : (1) constat (2) leviers prioritaires (3) actions concrètes.`,
};

const GUARDRAILS = `RÈGLES DURES :
- Ne jamais inventer un chiffre, une statistique ou une référence non présente dans le contexte.
- Citer les concepts signature en gras (ex. **CAB**, **filtre revenu**) quand pertinent.
- Tutoiement direct. Pas de "je suis désolé", pas de bullshit motivationnel.
- Phrases courtes. Pas de markdown excessif. Pas de listes de plus de 5 items.
- Si la query est hors scope coaching immo : recadrer poliment vers le métier.`;

function formatChunks(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";
  const items = chunks
    .map((c, idx) => {
      const src = c.sourceTitle ?? `source #${c.sourceId}`;
      return `[${idx + 1}] ${src} (sim ${c.similarity.toFixed(2)})\n${c.content.trim()}`;
    })
    .join("\n\n");
  return `

═══ CHUNKS PERTINENTS (extraits exacts du corpus coach) ═══
${items}`;
}

function formatSyntheses(syntheses: RetrievedSynthesis[]): string {
  if (syntheses.length === 0) return "";
  const items = syntheses
    .map((s, idx) => {
      const src = s.sourceTitle ?? `source #${s.sourceId}`;
      const label = s.sectionLabel ? ` — ${s.sectionLabel}` : "";
      return `[S${idx + 1}] ${src}${label} (sim ${s.similarity.toFixed(2)})\n${s.content.trim()}`;
    })
    .join("\n\n");
  return `

═══ SYNTHÈSES THÉMATIQUES (vues d'ensemble du corpus) ═══
${items}`;
}

function formatConcepts(
  concepts: Array<{ name: string; definition: string }>,
): string {
  if (concepts.length === 0) return "";
  const lines = concepts
    .map((c) => `- **${c.name}** : ${c.definition}`)
    .join("\n");
  return `

═══ GLOSSAIRE CONCEPTS SIGNATURE NXT ═══
${lines}

Cite ces concepts par leur nom (en gras) quand pertinent. Ne les invente pas, n'utilise que ceux ci-dessus.`;
}

export interface BuildSystemPromptInput {
  mode: CoachMode;
  chunks: RetrievedChunk[];
  syntheses: RetrievedSynthesis[];
  concepts: Array<{ name: string; definition: string }>;
}

export function buildSystemPrompt(input: BuildSystemPromptInput): string {
  return [
    IDENTITY,
    "",
    MODE_INSTRUCTIONS[input.mode],
    "",
    "═══ MÉTHODE COACHING NXT (doctrine de référence) ═══",
    COACHING_METHOD_NXT,
    formatConcepts(input.concepts),
    formatSyntheses(input.syntheses),
    formatChunks(input.chunks),
    "",
    GUARDRAILS,
  ]
    .filter((s) => s !== null && s !== undefined)
    .join("\n");
}

/**
 * Détection mode basique (regex sur la query user).
 * Aligné nxt-coach/lib/mode.ts. Default = strategique.
 */
const SOUTIEN_PATTERNS = /\b(crev[ée]|nul|marre|y arrive pas|d[ée]courag[ée]|fatigue|burn|saturé)\b/i;
const TACTIQUE_PATTERNS = /\b(donne[- ]moi la phrase|mot pour mot|au t[ée]l[ée]phone|script|verbatim|quoi dire|comment dire)\b/i;

export function detectMode(query: string): CoachMode {
  if (TACTIQUE_PATTERNS.test(query)) return "tactique";
  if (SOUTIEN_PATTERNS.test(query)) return "soutien";
  return "strategique";
}
