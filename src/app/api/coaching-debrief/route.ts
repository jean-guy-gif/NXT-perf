import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuth, getClientIp } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  generateDebriefHebdoRag,
  type DebriefInput,
} from "@/lib/server/coach-rag/debrief-hebdo-generator";
import {
  COACHING_CLOSING,
  isValidPersona,
  DEFAULT_PERSONA,
} from "@/lib/personas";
import type { PersonaId } from "@/lib/personas";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const FALLBACK_MODEL = "openai/gpt-4o-mini";

/**
 * /api/coaching-debrief — sous-PR Coach-5.
 *
 * Stratégie cascade :
 *   1. Tente generateDebriefHebdoRag() — Claude Sonnet 4.5 + retrieval corpus
 *      NXT-Coach + doctrine NXT. Voix Tedesco enrichie.
 *   2. Si null, fallback sur gpt-4o-mini sans retrieval (comportement legacy)
 *      pour ne pas casser l'UX existante.
 *   3. Si gpt-4o-mini fail aussi → 502 → le client a son fallback narratif
 *      local (cf. coaching-debrief.tsx).
 *
 * Auth : supporte mode démo via getOptionalAuth (Coach-4 pattern).
 */

function buildFallbackSystemPrompt(persona: PersonaId): string {
  return `Tu es un coach immobilier hebdomadaire.
Tu reformules un débrief coaching déjà calculé. Tu n'inventes RIEN.
Tu ne contredis JAMAIS les scores fournis. Tu restes concis.

TON : ${persona}

Règles :
- Phrases courtes
- Pas de bullshit motivationnel vide
- Pas d'invention de chiffres
- Tu termines TOUJOURS par la signature exacte : "${COACHING_CLOSING}"

Réponds UNIQUEMENT en JSON valide :
{
  "title": "Titre court du débrief (5 mots max)",
  "overallSummary": "1-2 phrases résumant la semaine",
  "volumeText": "1 phrase sur le volume",
  "performanceText": "1 phrase sur la performance/ratios",
  "strengthsText": "1 phrase sur les points forts",
  "watchoutsText": "1 phrase sur les points de vigilance",
  "nextWeekText": "1-2 phrases sur le plan semaine prochaine",
  "closing": "${COACHING_CLOSING}",
  "audioScript": "Version orale complète en 4-5 phrases courtes, fluide à l'oral"
}`;
}

function buildFallbackUserPrompt(input: DebriefInput): string {
  return `Voici le débrief calculé à reformuler :

Profil agent : ${input.profile}
Score volume : ${input.volumeScore}/100
Score performance : ${input.performanceScore}/100
Score global : ${input.compositeScore}/100

Volume (réalisé vs objectif) :
${input.volumeReview.map((v) => `- ${v.label}: ${v.actual}/${v.target} (${v.verdict})`).join("\n")}

Ratios de performance :
${input.performanceReview.map((r) => `- ${r.label}: ${r.value} (objectif ${r.target}, status ${r.status}, confiance ${r.confidence})`).join("\n")}

Points forts : ${input.strengths.join(" | ") || "aucun identifié"}
Points de vigilance : ${input.watchouts.join(" | ") || "aucun identifié"}
Priorités : ${input.topPriorities.join(" | ") || "aucune"}
Plan semaine : ${input.nextWeekPlan.map((a) => a.text).join(" | ") || "aucun"}

Reformule ce débrief de manière naturelle, concise et bienveillante.`;
}

async function fallbackGpt4oMini(input: DebriefInput): Promise<unknown | null> {
  if (!OPENROUTER_API_KEY) return null;
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://nxt-perf.vercel.app",
          "X-Title": "NXT Performance",
        },
        body: JSON.stringify({
          model: FALLBACK_MODEL,
          max_tokens: 512,
          messages: [
            { role: "system", content: buildFallbackSystemPrompt(input.persona) },
            { role: "user", content: buildFallbackUserPrompt(input) },
          ],
        }),
      },
    );
    const data = await response.json();
    if (!response.ok || data?.error) return null;
    const raw = data?.choices?.[0]?.message?.content || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(clean);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Sous-PR Coach-4 : support mode démo (anonyme).
  const { user } = await getOptionalAuth();
  const rateKey = user
    ? `coaching-debrief:user:${user.id}`
    : `coaching-debrief:ip:${getClientIp(request)}`;
  const rateMax = user ? 10 : 5;
  const { allowed } = checkRateLimit(rateKey, rateMax, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY not configured" },
      { status: 500 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const persona: PersonaId = isValidPersona(payload.persona)
    ? payload.persona
    : DEFAULT_PERSONA;

  const input: DebriefInput = {
    persona,
    profile: typeof payload.profile === "string" ? payload.profile : "",
    volumeScore:
      typeof payload.volumeScore === "number" ? payload.volumeScore : 0,
    performanceScore:
      typeof payload.performanceScore === "number"
        ? payload.performanceScore
        : 0,
    compositeScore:
      typeof payload.compositeScore === "number" ? payload.compositeScore : 0,
    volumeReview: Array.isArray(payload.volumeReview)
      ? (payload.volumeReview as DebriefInput["volumeReview"])
      : [],
    performanceReview: Array.isArray(payload.performanceReview)
      ? (payload.performanceReview as DebriefInput["performanceReview"])
      : [],
    strengths: Array.isArray(payload.strengths)
      ? (payload.strengths as string[])
      : [],
    watchouts: Array.isArray(payload.watchouts)
      ? (payload.watchouts as string[])
      : [],
    topPriorities: Array.isArray(payload.topPriorities)
      ? (payload.topPriorities as string[])
      : [],
    nextWeekPlan: Array.isArray(payload.nextWeekPlan)
      ? (payload.nextWeekPlan as Array<{ text: string }>)
      : [],
  };

  // Cascade : RAG Sonnet 4.5 → fallback gpt-4o-mini sans RAG.
  const ragOutput = await generateDebriefHebdoRag(input);
  if (ragOutput) {
    return NextResponse.json(ragOutput);
  }

  const fallback = await fallbackGpt4oMini(input);
  if (fallback) {
    return NextResponse.json(fallback);
  }

  return NextResponse.json(
    { error: "AI generation failed" },
    { status: 502 },
  );
}
