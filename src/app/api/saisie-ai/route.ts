import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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

export async function POST(request: NextRequest) {
  try {
  const { action, text, currentFields, imageBase64, imageMediaType } = await request.json();

  console.log("[saisie-ai] action:", action, "| key present:", !!ANTHROPIC_API_KEY);

  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  if (action === "extract") {
    const prompt = `Tu es NXT Assistant, un assistant commercial pour agents immobiliers.

L'agent vient de dire : "${text}"

Extrait tous les chiffres mentionnés et associe-les aux champs suivants :
${Object.entries(SAISIE_FIELDS).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

Champs déjà remplis (ne pas écraser sauf si l'agent les corrige explicitement) :
${JSON.stringify(currentFields)}

Réponds UNIQUEMENT en JSON valide avec cette structure :
{
  "extracted": { // champs extraits et leurs valeurs numériques
    "nomDuChamp": valeurNumerique
  },
  "missingImportant": ["liste des champs importants non mentionnés"],
  "followUpQuestion": "Une seule question naturelle et concise pour obtenir les infos manquantes les plus importantes. Commence directement par la question, sans formule de politesse. Sois bref et direct.",
  "confidence": 0.0 à 1.0
}

Si l'agent n'a rien mentionné de pertinent, extracted sera vide.
La followUpQuestion doit être la question la plus utile pour compléter le tableau de bord.
Priorise : contacts, estimations, mandats, compromis, CA.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const content = data.content[0]?.text || "{}";

    try {
      const clean = content.replace(/```json|```/g, "").trim();
      return NextResponse.json(JSON.parse(clean));
    } catch {
      return NextResponse.json({ extracted: {}, missingImportant: [], followUpQuestion: "Pouvez-vous me donner vos chiffres principaux de la semaine ?", confidence: 0 });
    }
  }

  if (action === "extract_image") {
    const prompt = `Tu es NXT Assistant, spécialiste en analyse de documents immobiliers.

Analyse cette image qui peut être :
- Une capture d'écran de CRM (Apimo, Hektor, AC3, Netty, Périclès)
- Un rapport d'activité hebdomadaire ou mensuel
- Un tableau Excel ou Google Sheets d'activité commerciale
- Des notes manuscrites d'un agent immobilier
- Un récapitulatif de performance

Lis TOUTES les données visibles et associe-les aux indicateurs suivants :
${Object.entries(SAISIE_FIELDS).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

IMPORTANT :
- Cherche chaque indicateur partout dans l'image, même si libellés différemment
- "Prise de contact" = contacts entrants, "Mandats rentrés" = mandats signés, etc.
- En cas de doute sur une valeur, inclus-la quand même avec confidence faible
- N'invente PAS de valeurs — si tu ne vois pas la donnée, ne l'inclus pas

Réponds UNIQUEMENT en JSON :
{
  "extracted": { "nomDuChamp": valeurNumerique },
  "description": "Description en 1 phrase de ce que montre l'image (type de document + période si visible)",
  "unrecognized": ["libellés trouvés dans l'image que tu n'as pas pu mapper"],
  "confidence": 0.0 à 1.0
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: imageMediaType || "image/jpeg", data: imageBase64 },
            },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });

    const data = await response.json();
    const content = data.content[0]?.text || "{}";

    try {
      const clean = content.replace(/```json|```/g, "").trim();
      return NextResponse.json(JSON.parse(clean));
    } catch {
      return NextResponse.json({ extracted: {}, description: "Impossible de lire l'image", confidence: 0 });
    }
  }

  if (action === "greet") {
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString("fr-FR", { weekday: "long" });
    const isMandatory = currentFields?.isMandatory || false;

    const prompt = `Tu es NXT Assistant, un assistant vocal commercial pour agents immobiliers.

Génère un message d'accueil très court (2 phrases max) pour un agent immobilier en ce ${dayOfWeek}.
${isMandatory ? "La saisie hebdomadaire est OBLIGATOIRE - l'agent doit saisir avant d'accéder au dashboard." : "L'agent ouvre l'assistant volontairement."}

Sois chaleureux, professionnel, direct. Demande-lui de parler de son activité récente.
Réponds avec uniquement le texte du message, sans JSON.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    return NextResponse.json({ message: data.content[0]?.text || "Bonjour ! Parlez-moi de votre semaine." });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[saisie-ai] Unhandled error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
