/**
 * Extraction de patterns coaching via OpenRouter (PR-C).
 *
 * Stratégie :
 *   - Prompt système strict : interdit de citer noms/lieux/dates ;
 *     interdit de produire des phrases qui ressemblent à du transcript.
 *   - Sortie JSON forcée (`response_format: json_object`).
 *   - Validation stricte côté client : si shape KO ou aucun pattern
 *     actionnable → renvoie liste vide (run.ts log + skip).
 *
 * Note : on ne demande PAS le levier au LLM puis on valide — on liste les
 * 8 leviers attendus dans le prompt et on demande au LLM d'attribuer
 * chaque pattern extrait à l'un des 8. C'est plus fiable que de laisser
 * le LLM créer ses propres catégories.
 */

import { ALL_AXES, ALL_EXPERTISE_IDS } from "./types";
import type { Axis, ExpertiseRatioId, ExtractedPattern, ExtractionResult } from "./types";

interface RawPattern {
  expertise_id: unknown;
  axis: unknown;
  text: unknown;
}

interface RawResponse {
  patterns: RawPattern[];
  notes?: unknown;
}

const SYSTEM_PROMPT = `Tu es un analyste senior de coaching commercial immobilier.
Tu lis des notes de débriefs anonymisés et tu en extrais UNIQUEMENT des patterns
génériques utiles pour qu'un manager prépare ses coachings 1:1.

RÈGLES STRICTES (NE JAMAIS DÉROGER) :
- Ne JAMAIS citer un nom de personne, d'agence, de ville, de date, de montant.
- Ne JAMAIS reproduire une phrase littérale du débrief.
- Ne JAMAIS créer un pattern qui pourrait identifier un individu.
- Produire UNIQUEMENT des formulations généralisables.
- Si un débrief ne traite pas de coaching commercial immobilier, retourner une liste vide.
- Si un débrief est trop court ou ambigu, retourner une liste vide.

Catégories de leviers (expertise_id) AUTORISÉES (8 et pas d'autres) :
${ALL_EXPERTISE_IDS.map((id) => `- ${id}`).join("\n")}

Axes de pattern (axis) AUTORISÉS (4 et pas d'autres) :
- behavior  : un comportement OBSERVÉ chez le conseiller (générique)
- mistake   : une erreur RÉCURRENTE / anti-pattern à débusquer
- question  : une question SIGNAL qu'un coach poserait pour faire surgir le frein
- angle     : un ANGLE de coaching à proposer (jeu de rôle, script, séquencement)

Sortie : JSON strict de cette forme :
{
  "patterns": [
    { "expertise_id": "...", "axis": "behavior" | "mistake" | "question" | "angle", "text": "..." },
    ...
  ],
  "notes": "..." (optionnel, court)
}

Cible : 0 à 8 patterns par débrief. Mieux vaut 0 que des patterns peu actionnables.`;

export async function extractPatterns(
  anonymizedText: string,
  config: { openrouterApiKey: string; openrouterModel: string },
): Promise<ExtractionResult> {
  const userPrompt = `Voici un débrief anonymisé. Extrait des patterns selon les règles strictes.\n\n---\n${anonymizedText}\n---`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openrouterApiKey}`,
      "HTTP-Referer": "https://nxt-performance.app",
      "X-Title": "NXT Performance — Coach Brain Ingestion",
    },
    body: JSON.stringify({
      model: config.openrouterModel,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return { patterns: [], notes: "Empty LLM response" };
  }

  return parseAndValidate(content);
}

// ─── Parsing + validation ──────────────────────────────────────────────────

function parseAndValidate(raw: string): ExtractionResult {
  let parsed: RawResponse;
  try {
    parsed = JSON.parse(raw) as RawResponse;
  } catch {
    return { patterns: [], notes: "Invalid JSON" };
  }
  const inputPatterns = Array.isArray(parsed.patterns) ? parsed.patterns : [];
  const out: ExtractedPattern[] = [];

  for (const p of inputPatterns) {
    if (!isValidExpertiseId(p.expertise_id)) continue;
    if (!isValidAxis(p.axis)) continue;
    if (typeof p.text !== "string") continue;
    const text = p.text.trim();
    if (text.length < 8 || text.length > 400) continue;
    if (looksLikeProperNoun(text)) continue;
    out.push({
      expertiseId: p.expertise_id,
      axis: p.axis,
      text,
    });
  }

  return {
    patterns: out,
    notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 200) : undefined,
  };
}

function isValidExpertiseId(v: unknown): v is ExpertiseRatioId {
  return typeof v === "string" && ALL_EXPERTISE_IDS.includes(v as ExpertiseRatioId);
}

function isValidAxis(v: unknown): v is Axis {
  return typeof v === "string" && ALL_AXES.includes(v as Axis);
}

/**
 * Heuristique légère pour rejeter les patterns qui ressemblent à un nom
 * propre échappé (filet de sécurité supplémentaire après l'anonymisation
 * regex). Détecte 2+ mots capitalisés consécutifs hors début de phrase.
 */
function looksLikeProperNoun(text: string): boolean {
  // Retire les marqueurs d'anonymisation pour pas matcher dessus
  const stripped = text.replace(/\[(ANONYME|EMAIL|TEL|ADRESSE|CP_VILLE|MONTANT|URL)\]/g, "");
  const properNounSeq = /(?:^|[^A-Za-zÀ-ÿ])([A-ZÉÈÀÇÊ][a-zéèàçêîôû]{2,}\s+[A-ZÉÈÀÇÊ][a-zéèàçêîôû]{2,})/;
  return properNounSeq.test(stripped);
}
