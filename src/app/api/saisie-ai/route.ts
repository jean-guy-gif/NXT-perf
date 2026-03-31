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
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const action = body.action as string;

  console.log("[saisie-ai] action:", action, "| key present:", !!ANTHROPIC_API_KEY);

  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

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
  "extracted": { // champs extraits et leurs valeurs numériques
    "nomDuChamp": valeurNumerique
  },
  "missingImportant": ["liste des champs importants non mentionnés"],
  "followUpQuestion": "Une seule question naturelle et concise pour obtenir les infos manquantes les plus importantes. Commence directement par la question, sans formule de politesse. Sois bref et direct.",
  "confidence": 0.0 à 1.0
}

Si l'agent n'a rien mentionné de pertinent, extracted sera vide.
La followUpQuestion doit être la question la plus utile pour compléter le tableau de bord.
Priorise : contacts, estimations, mandats, compromis, CA.

IMPORTANT : Si le texte contient un tableau avec plusieurs lignes de données, SOMME les valeurs par colonne.
Mapping colonnes : "Contacts" → contactsTotaux/contactsEntrants, "RDV" → rdvEstimation, "Estimations" → estimationsRealisees, "Mandats" → mandatsSignes, "Visites" → nombreVisites, "Offres" → offresRecues, "Compromis" → compromisSignes, "CA"/"CA (€)" → chiffreAffaires, "Actes" → actesSignes.`;

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
    const imageBase64 = body.imageBase64 as string || "";
    const imageMediaType = body.imageMediaType as string || "image/jpeg";
    const prompt = `Tu es NXT Assistant, spécialiste en analyse de documents immobiliers.

Analyse cette image. Elle peut être une capture d'écran de CRM, un rapport d'activité, un tableau Excel/Google Sheets, des notes manuscrites, ou un récapitulatif.

INSTRUCTIONS :
1. Si l'image contient un TABLEAU avec PLUSIEURS LIGNES, SOMME les valeurs de chaque colonne pour obtenir les totaux.
2. Voici le mapping des colonnes vers nos champs :
   - "Contacts" ou "Contacts entrants" → contactsEntrants ET contactsTotaux
   - "RDV" ou "RDV estimation" → rdvEstimation
   - "Estimations" → estimationsRealisees
   - "Mandats" ou "Mandats signés" → mandatsSignes
   - "Visites" → nombreVisites
   - "Offres" → offresRecues
   - "Compromis" → compromisSignes
   - "CA" ou "CA (€)" → chiffreAffaires
   - "Actes" → actesSignes
   - "Suivi" ou "RDV suivi" → rdvSuivi
   - "Requalification" → requalification
   - "Baisses de prix" → baissePrix
   - "Acheteurs chauds" → acheteursChaudsCount
   - "Acheteurs sortis visite" → acheteursSortisVisite
3. Si les lignes sont catégorisées par Type (Prospection, Vendeurs, Acheteurs, Ventes), IGNORE la catégorie et somme TOUT.
4. N'invente PAS de valeurs. Si tu ne vois pas une donnée, ne l'inclus pas.

Champs attendus :
${Object.entries(SAISIE_FIELDS).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

Réponds UNIQUEMENT en JSON :
{
  "extracted": { "nomDuChamp": valeurNumerique },
  "description": "Description en 1 phrase (type de document + période si visible)",
  "unrecognized": ["libellés visibles non mappés"],
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
    const currentFields = body.currentFields as Record<string, unknown> || {};
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

  if (action === "extract_document") {
    const textContent = body.textContent as string || "";
    const fileName = body.fileName as string || "document";

    const prompt = `Tu es NXT Assistant, spécialiste en analyse de tableaux d'activité immobilière.

Voici le contenu extrait du fichier "${fileName}" :

${textContent.slice(0, 8000)}

INSTRUCTIONS :
1. Ce document contient probablement PLUSIEURS LIGNES de données. Tu dois SOMMER les valeurs de chaque colonne pour obtenir les totaux.
2. Les colonnes peuvent s'appeler différemment. Voici le mapping :
   - "Contacts" ou "Contacts entrants" ou "Prise de contact" → additionner pour contactsTotaux ET contactsEntrants
   - "RDV" ou "RDV estimation" ou "Rendez-vous" → rdvEstimation
   - "Estimations" ou "Estim" → estimationsRealisees
   - "Mandats" ou "Mandats signés" ou "Mandats rentrés" → mandatsSignes
   - "Visites" ou "Nb visites" → nombreVisites
   - "Offres" ou "Offres reçues" → offresRecues
   - "Compromis" ou "Compromis signés" → compromisSignes
   - "CA" ou "CA (€)" ou "Chiffre d'affaires" → chiffreAffaires
   - "Actes" ou "Actes signés" → actesSignes
   - "Suivi" ou "RDV suivi" → rdvSuivi
   - "Requalification" → requalification
   - "Baisse" ou "Baisses de prix" → baissePrix
   - "Acheteurs chauds" → acheteursChaudsCount
   - "Acheteurs sortis visite" → acheteursSortisVisite
3. Les lignes peuvent être catégorisées par "Type" (Prospection, Vendeurs, Acheteurs, Ventes). IGNORE la catégorie — somme TOUTES les lignes ensemble par colonne.
4. Ignore les valeurs 0 ou vides dans la somme.
5. N'invente PAS de valeurs — si une colonne n'existe pas, ne l'inclus pas.

Champs attendus :
${Object.entries(SAISIE_FIELDS).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

Réponds UNIQUEMENT en JSON :
{
  "extracted": { "nomDuChamp": valeurNumérique },
  "description": "Description en 1 phrase (type de document + période si visible)",
  "confidence": 0.0 à 1.0
}`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY!,
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
      const clean = content.replace(/```json|```/g, "").trim();
      return NextResponse.json(JSON.parse(clean));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[saisie-ai] Unhandled error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
