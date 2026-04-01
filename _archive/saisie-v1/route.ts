import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const SAISIE_FIELDS = {
  contactsEntrants: "contacts entrants (personnes qui ont appelé ou écrit)",
  contactsTotaux: "contacts totaux (tous les contacts pris ou reçus)",
  rdvEstimation: "RDV estimations (rendez-vous d'estimation pris)",
  estimationsRealisees: "estimations réalisées (visites d'estimation effectuées)",
  mandatsSignes: "mandats signés (nombre de mandats)",
  rdvSuivi: "RDV de suivi vendeurs",
  requalification: "requalifications (vendeurs requalifiés)",
  baissePrix: "baisses de prix obtenues",
  acheteursChaudsCount: "acheteurs chauds (acheteurs actifs en recherche)",
  acheteursSortisVisite: "acheteurs sortis en visite",
  nombreVisites: "nombre de visites réalisées",
  offresRecues: "offres reçues",
  compromisSignes: "compromis signés",
  actesSignes: "actes signés (ventes finalisées chez le notaire)",
  chiffreAffaires: "chiffre d'affaires (en euros, honoraires encaissés ou à encaisser)",
};

// ── Helper : appel OpenRouter ─────────────────────────────────────────────────
async function callOpenRouter(
  prompt: string,
  maxTokens = 1024,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imageContent?: { base64: string; mediaType: string }
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let messages: any[];

  if (imageContent) {
    messages = [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${imageContent.mediaType};base64,${imageContent.base64}` } },
        { type: "text", text: prompt },
      ],
    }];
  } else {
    messages = [{ role: "user", content: prompt }];
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://nxt-perf.vercel.app",
      "X-Title": "NXT Performance",
    },
    body: JSON.stringify({
      model: imageContent ? "google/gemini-2.0-flash-001" : "google/gemini-2.0-flash-001",
      max_tokens: maxTokens,
      messages,
    }),
  });

  const data = await response.json();

  if (!response.ok || data?.error) {
    const errMsg = data?.error?.message || data?.error || response.statusText;
    console.error("[saisie-ai] OpenRouter error:", JSON.stringify(errMsg).slice(0, 500));
    throw new Error(typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg));
  }

  return data?.choices?.[0]?.message?.content || "{}";
}

// ── Helper : parse JSON depuis la réponse LLM ────────────────────────────────
function parseJsonResponse(raw: string): Record<string, unknown> {
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const action = body.action as string;

    console.log("[saisie-ai] action:", action, "| key present:", !!OPENROUTER_API_KEY);

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
    }

    // ── extract (voix / texte) ────────────────────────────────────────────────
    if (action === "extract") {
      const text = body.text as string || "";
      const currentFields = body.currentFields as Record<string, unknown> || {};

      const prompt = `Tu es NXT Assistant, un assistant commercial pour agents immobiliers.

L'agent vient de dire : "${text}"

Extrait tous les chiffres mentionnés et associe-les aux champs suivants :
${Object.entries(SAISIE_FIELDS).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

Champs déjà remplis (ne pas écraser sauf si l'agent les corrige explicitement) :
${JSON.stringify(currentFields)}

Réponds UNIQUEMENT en JSON valide avec cette structure :
{
  "extracted": { "nomDuChamp": valeurNumerique },
  "missingImportant": ["liste des champs importants non mentionnés"],
  "followUpQuestion": "Question concise pour les infos manquantes. Directe, sans politesse.",
  "confidence": 0.0 à 1.0
}

Si le texte contient un tableau multi-lignes, SOMME les valeurs par colonne.
Mapping : "Contacts" → contactsTotaux/contactsEntrants, "RDV" → rdvEstimation, "Estimations" → estimationsRealisees, "Mandats" → mandatsSignes, "Visites" → nombreVisites, "Offres" → offresRecues, "Compromis" → compromisSignes, "CA"/"CA (€)" → chiffreAffaires, "Actes" → actesSignes.
Priorise : contacts, estimations, mandats, compromis, CA.`;

      try {
        const raw = await callOpenRouter(prompt);
        const parsed = parseJsonResponse(raw);
        return NextResponse.json(parsed);
      } catch {
        return NextResponse.json({
          extracted: {},
          missingImportant: [],
          followUpQuestion: "Pouvez-vous me donner vos chiffres principaux ?",
          confidence: 0,
        });
      }
    }

    // ── extract_image ─────────────────────────────────────────────────────────
    if (action === "extract_image") {
      const imageBase64 = body.imageBase64 as string || "";
      const imageMediaType = body.imageMediaType as string || "image/jpeg";

      const prompt = `Tu es NXT Assistant, spécialiste en analyse de documents immobiliers.

Analyse cette image (capture CRM, rapport d'activité, tableau Excel, notes manuscrites…).

INSTRUCTIONS :
1. Si TABLEAU multi-lignes → SOMME les valeurs par colonne.
2. Mapping colonnes :
   "Contacts" → contactsEntrants + contactsTotaux, "RDV" → rdvEstimation,
   "Estimations" → estimationsRealisees, "Mandats" → mandatsSignes,
   "Visites" → nombreVisites, "Offres" → offresRecues,
   "Compromis" → compromisSignes, "CA"/"CA (€)" → chiffreAffaires,
   "Actes" → actesSignes, "Suivi" → rdvSuivi, "Requalification" → requalification,
   "Baisses de prix" → baissePrix, "Acheteurs chauds" → acheteursChaudsCount,
   "Acheteurs sortis visite" → acheteursSortisVisite.
3. Si lignes catégorisées par Type → IGNORE la catégorie, somme TOUT.
4. N'invente PAS de valeurs.

Réponds UNIQUEMENT en JSON :
{
  "extracted": { "nomDuChamp": valeurNumerique },
  "description": "Description en 1 phrase",
  "confidence": 0.0 à 1.0
}`;

      try {
        const raw = await callOpenRouter(prompt, 1024, { base64: imageBase64, mediaType: imageMediaType });
        const parsed = parseJsonResponse(raw);
        return NextResponse.json(parsed);
      } catch {
        return NextResponse.json({ extracted: {}, description: "Impossible de lire l'image", confidence: 0 });
      }
    }

    // ── greet ─────────────────────────────────────────────────────────────────
    if (action === "greet") {
      const currentFields = body.currentFields as Record<string, unknown> || {};
      const today = new Date();
      const dayOfWeek = today.toLocaleDateString("fr-FR", { weekday: "long" });
      const isMandatory = currentFields?.isMandatory || false;

      const prompt = `Tu es NXT Assistant pour agents immobiliers.
Message d'accueil court (2 phrases max) en ce ${dayOfWeek}.
${isMandatory ? "La saisie est OBLIGATOIRE." : "L'agent ouvre l'assistant volontairement."}
Chaleureux, professionnel, direct. Demande ses chiffres récents.
Réponds avec le texte uniquement.`;

      try {
        const raw = await callOpenRouter(prompt, 150);
        return NextResponse.json({ message: raw.trim() || "Bonjour ! Parlez-moi de votre semaine." });
      } catch {
        return NextResponse.json({ message: "Bonjour ! Parlez-moi de votre semaine." });
      }
    }

    // ── extract_document (Excel, Word, CSV…) ──────────────────────────────────
    if (action === "extract_document") {
      const textContent = body.textContent as string || "";
      const fileName = body.fileName as string || "document";

      const prompt = `Tu es NXT Assistant, spécialiste en analyse de tableaux d'activité immobilière.

Fichier "${fileName}" — contenu :

${textContent.slice(0, 8000)}

INSTRUCTIONS :
1. SOMME les valeurs de chaque colonne sur TOUTES les lignes.
2. Mapping colonnes :
   "Contacts" → contactsTotaux + contactsEntrants, "RDV" → rdvEstimation,
   "Estimations" → estimationsRealisees, "Mandats" → mandatsSignes,
   "Visites" → nombreVisites, "Offres" → offresRecues,
   "Compromis" → compromisSignes, "CA"/"CA (€)" → chiffreAffaires,
   "Actes" → actesSignes, "Suivi" → rdvSuivi, "Requalification" → requalification,
   "Baisses de prix" → baissePrix, "Acheteurs chauds" → acheteursChaudsCount.
3. Si lignes catégorisées par Type → IGNORE la catégorie, somme TOUT.
4. N'invente PAS de valeurs.

Réponds UNIQUEMENT en JSON :
{
  "extracted": { "nomDuChamp": valeurNumerique },
  "description": "Description en 1 phrase (type + période si visible)",
  "confidence": 0.0 à 1.0
}`;

      try {
        const raw = await callOpenRouter(prompt);
        const parsed = parseJsonResponse(raw);
        return NextResponse.json(parsed);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ extracted: {}, description: `Erreur : ${msg}`, confidence: 0 });
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[saisie-ai] Unhandled error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
