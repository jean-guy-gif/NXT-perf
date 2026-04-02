import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "openai/gpt-4o-mini";

const SYSTEM_PROMPT = `Tu es un coach immobilier hebdomadaire bienveillant et exigeant.
Tu reformules un débrief coaching déjà calculé. Tu n'inventes RIEN.
Tu ne contredis JAMAIS les scores fournis. Tu restes concis.

Règles :
- Ton juste, bienveillant, clair, professionnel
- Phrases courtes
- Pas de bullshit motivationnel vide
- Pas d'invention de chiffres
- Tu termines TOUJOURS par la signature exacte : "T'es meilleur que tu crois. Bonne route."

Réponds UNIQUEMENT en JSON valide :
{
  "title": "Titre court du débrief (5 mots max)",
  "overallSummary": "1-2 phrases résumant la semaine",
  "volumeText": "1 phrase sur le volume",
  "performanceText": "1 phrase sur la performance/ratios",
  "strengthsText": "1 phrase sur les points forts",
  "watchoutsText": "1 phrase sur les points de vigilance",
  "nextWeekText": "1-2 phrases sur le plan semaine prochaine",
  "closing": "T'es meilleur que tu crois. Bonne route.",
  "audioScript": "Version orale complète en 4-5 phrases courtes, fluide à l'oral"
}`;

export async function POST(request: NextRequest) {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
    }

    const payload = await request.json();

    const userPrompt = `Voici le débrief calculé à reformuler :

Profil agent : ${payload.profile}
Score volume : ${payload.volumeScore}/100
Score performance : ${payload.performanceScore}/100
Score global : ${payload.compositeScore}/100

Volume (réalisé vs objectif) :
${(payload.volumeReview || []).map((v: { label: string; actual: number; target: number; verdict: string }) => `- ${v.label}: ${v.actual}/${v.target} (${v.verdict})`).join("\n")}

Ratios de performance :
${(payload.performanceReview || []).map((r: { label: string; value: number; target: number; status: string; confidence: string }) => `- ${r.label}: ${r.value} (objectif ${r.target}, status ${r.status}, confiance ${r.confidence})`).join("\n")}

Points forts : ${(payload.strengths || []).join(" | ") || "aucun identifié"}
Points de vigilance : ${(payload.watchouts || []).join(" | ") || "aucun identifié"}
Priorités : ${(payload.topPriorities || []).join(" | ") || "aucune"}
Plan semaine : ${(payload.nextWeekPlan || []).map((a: { text: string }) => a.text).join(" | ") || "aucun"}

Reformule ce débrief de manière naturelle, concise et bienveillante.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://nxt-perf.vercel.app",
        "X-Title": "NXT Performance",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok || data?.error) {
      console.error("[coaching-debrief] OpenRouter error:", data?.error);
      return NextResponse.json({ error: "AI generation failed" }, { status: 502 });
    }

    const raw = data?.choices?.[0]?.message?.content || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();

    try {
      const parsed = JSON.parse(clean);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ error: "Invalid JSON from AI" }, { status: 502 });
    }
  } catch (err) {
    console.error("[coaching-debrief] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
