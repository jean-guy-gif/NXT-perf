import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "google/gemini-2.0-flash-001";

// ── Dictionnaire d'alias immobilier ──────────────────────────────────────────

const ALIAS_DICTIONARY = `
DICTIONNAIRE D'ALIAS — Mapping obligatoire :
- "MS", "Mandat Simple", "M. Simple" → mandats[].type = "simple"
- "ME", "Exclusif", "Mandat Exclusif", "MEx" → mandats[].type = "exclusif"
- "SSP", "Compromis", "Promesse", "CSSP" → compromisSignes
- "AA", "Acte", "Acte Authentique", "Vente" (en tant que résultat final) → actesSignes
- "CA", "HO", "Honoraires", "Comm.", "Commission" → chiffreAffaires
- "Contacts", "Appels", "Prospects", "Leads" → contactsTotaux
- "Entrants", "Portail", "Vitrine", "Leads entrants" → contactsEntrants
- "Estim", "RDV Estim", "Estimation", "Évaluation" → estimationsRealisees
- "Mandat", "Prise de mandat", "Mandats" → mandatsSignes
- "Visite", "Sortie visite", "Visites acquéreurs" → nombreVisites
- "Offre", "OP", "Offre d'achat" → offresRecues
- "Suivi", "RDV suivi", "Suivi vendeur" → rdvSuivi
- "Requalif", "Requalification", "Simple→Exclusif" → requalificationSimpleExclusif
- "Baisse", "Baisse de prix", "Baisses" → baissePrix
- "Acheteurs chauds", "Acquéreurs qualifiés" → acheteursChaudsCount
- "Acheteurs sortis", "Sortis visite" → acheteursSortisVisite
- "RDV estimation", "RDV estim" → rdvEstimation
`;

// ── Prompt système partagé ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es NXT Assistant, spécialiste en analyse de données d'activité immobilière.

${ALIAS_DICTIONARY}

CHAMPS DE SORTIE (JSON) :
Numériques :
- contactsTotaux (number) — tous contacts pris ou reçus
- contactsEntrants (number) — contacts entrants (portails, vitrine)
- rdvEstimation (number) — RDV estimation décrochés
- estimationsRealisees (number) — estimations effectuées
- mandatsSignes (number) — nombre total de mandats signés
- rdvSuivi (number) — RDV de suivi vendeurs
- requalificationSimpleExclusif (number) — requalifications simple→exclusif
- baissePrix (number) — baisses de prix obtenues
- acheteursChaudsCount (number) — nombre d'acheteurs chauds
- acheteursSortisVisite (number) — acheteurs distincts sortis en visite
- nombreVisites (number) — nombre total de visites
- offresRecues (number) — offres reçues
- compromisSignes (number) — compromis signés
- actesSignes (number) — actes signés chez le notaire
- chiffreAffaires (number) — CA en euros
- delaiMoyenVente (number) — délai moyen en jours

Tableaux (si les noms/détails sont disponibles) :
- mandats: [{ nomVendeur: string, type: "simple"|"exclusif" }]
- informationsVente: [{ nom: string, commentaire: string }]
- acheteursChauds: [{ nom: string, commentaire: string }]

RÈGLES :
1. Si TABLEAU multi-lignes → SOMME les valeurs numériques par colonne sur TOUTES les lignes.
2. Si lignes catégorisées par Type/Agent/Équipe → IGNORE la catégorie, somme TOUT.
3. Utilise le dictionnaire d'alias pour mapper les libellés non-standards.
4. N'INVENTE PAS de valeurs. Si un champ n'est pas trouvé, ne l'inclus pas.
5. Si une valeur est approximative ou incertaine, ajoute "uncertain": true sur ce champ.
6. Pour les montants en euros : retire les séparateurs de milliers et le symbole €.

FORMAT DE RÉPONSE — JSON strict, rien d'autre :
{
  "extracted": { "nomDuChamp": valeurNumérique, ... },
  "arrays": {
    "mandats": [{ "nomVendeur": "...", "type": "simple"|"exclusif" }],
    "informationsVente": [{ "nom": "...", "commentaire": "..." }],
    "acheteursChauds": [{ "nom": "...", "commentaire": "..." }]
  },
  "uncertain": ["liste des champs à valeur incertaine"],
  "unmapped": ["libellés trouvés dans le document mais non reconnus"],
  "description": "Description en 1 phrase (type de document + période si visible)",
  "confidence": 0.0 à 1.0
}`;

// ── Helper : appel OpenRouter ────────────────────────────────────────────────

async function callOpenRouter(
  prompt: string,
  maxTokens = 2048,
  imageContent?: { base64: string; mediaType: string },
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let messages: any[];

  if (imageContent) {
    messages = [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${imageContent.mediaType};base64,${imageContent.base64}`,
            },
          },
          { type: "text", text: prompt },
        ],
      },
    ];
  } else {
    messages = [{ role: "user", content: prompt }];
  }

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
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages }),
    },
  );

  const data = await response.json();

  if (!response.ok || data?.error) {
    const errMsg =
      data?.error?.message || data?.error || response.statusText;
    console.error(
      "[saisie-ai] OpenRouter error:",
      JSON.stringify(errMsg).slice(0, 500),
    );
    throw new Error(typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg));
  }

  return data?.choices?.[0]?.message?.content || "{}";
}

// ── Helper : parse JSON depuis la réponse LLM ───────────────────────────────

function parseJsonResponse(raw: string): Record<string, unknown> {
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const action = body.action as string;

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not configured" },
        { status: 500 },
      );
    }

    // ── extract_document (Excel, CSV, Word → texte) ──────────────────────────
    if (action === "extract_document") {
      const textContent = (body.textContent as string) || "";
      const fileName = (body.fileName as string) || "document";

      const prompt = `${SYSTEM_PROMPT}

Fichier "${fileName}" — contenu texte :

${textContent.slice(0, 12000)}

Analyse ce document et extrais les données d'activité immobilière.
Réponds UNIQUEMENT en JSON valide selon le format spécifié.`;

      try {
        const raw = await callOpenRouter(prompt);
        const parsed = parseJsonResponse(raw);
        return NextResponse.json(parsed);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({
          extracted: {},
          arrays: {},
          uncertain: [],
          unmapped: [],
          description: `Erreur : ${msg}`,
          confidence: 0,
        });
      }
    }

    // ── extract_image (Image / PDF base64) ───────────────────────────────────
    if (action === "extract_image") {
      const imageBase64 = (body.imageBase64 as string) || "";
      const imageMediaType =
        (body.imageMediaType as string) || "image/jpeg";

      const prompt = `${SYSTEM_PROMPT}

Analyse cette image (capture CRM, rapport d'activité, tableau Excel, notes manuscrites, PDF scanné…).
Extrais les données d'activité immobilière.
Réponds UNIQUEMENT en JSON valide selon le format spécifié.`;

      try {
        const raw = await callOpenRouter(prompt, 2048, {
          base64: imageBase64,
          mediaType: imageMediaType,
        });
        const parsed = parseJsonResponse(raw);
        return NextResponse.json(parsed);
      } catch {
        return NextResponse.json({
          extracted: {},
          arrays: {},
          uncertain: [],
          unmapped: [],
          description: "Impossible de lire l'image",
          confidence: 0,
        });
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[saisie-ai] Unhandled error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
