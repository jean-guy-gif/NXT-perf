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

/**
 * Garantit qu'une valeur de header HTTP est ASCII-only (compatible
 * `fetch` qui exige une `ByteString`, code points 0..255). Les caractères
 * non-ASCII fréquents (em dash —, accents, etc.) sont remplacés par leur
 * équivalent ASCII si possible, sinon supprimés.
 *
 * Solution déterministe : NFKD-normalisation + suppression des marks +
 * remplacement des tirets longs/courts unicode + filtrage final.
 */
function toAsciiHeader(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[‐-―]/g, "-") // tous les tirets unicode (—, –, ‒, …) → "-"
    .replace(/[‘’]/g, "'") // guillemets typographiques simples
    .replace(/[“”]/g, '"') // guillemets typographiques doubles
    .replace(/[ ]/g, " ") // espace insécable → espace
    .replace(/[̀-ͯ]/g, "") // marks de combinaison (accents)
    .replace(/[^\x00-\x7F]/g, ""); // suppression de tout reste non-ASCII
}

interface RawPattern {
  expertise_id: unknown;
  axis: unknown;
  text: unknown;
}

interface RawResponse {
  patterns: RawPattern[];
  notes?: unknown;
}

const SYSTEM_PROMPT = `Tu es un analyste senior de coaching commercial immobilier transaction.
Tu lis des notes de débriefs anonymisés et tu en extrais UNIQUEMENT des patterns
DIRECTEMENT UTILISABLES par un manager immobilier en coaching live.

═══ RÈGLES ANTI-PII (NE JAMAIS DÉROGER) ═══
- Ne JAMAIS citer un nom de personne, d'agence, de ville, de date, de montant.
- Ne JAMAIS reproduire une phrase littérale du débrief.
- Ne JAMAIS créer un pattern qui pourrait identifier un individu.

═══ RÈGLES DE QUALITÉ MÉTIER (NE JAMAIS DÉROGER) ═══

STYLE OBLIGATOIRE :
- Direct, terrain, langage coaching manager immobilier transaction.
- PAS de langage académique, PAS de circonlocutions.
- 160 caractères max par texte si possible, 220 maximum absolu.

FORMULATIONS INTERDITES (le pattern sera rejeté si ces tournures apparaissent) :
- "Le coach pourrait..."
- "Il serait intéressant de..."
- "Encourager le conseiller à..."
- "améliorer la communication"
- "se démarquer de la concurrence"
- "apporter de la valeur" (sauf si transformé en action concrète liée au levier)

ALIGNEMENT STRICT AVEC expertise_id :
Chaque pattern DOIT être directement actionnable sur le levier choisi. Si tu hésites
entre deux leviers ou si l'observation est trop transverse, NE LE PRODUIS PAS.

FORMAT PAR AXE (à respecter à la lettre) :

axis = "question"
  → UNE QUESTION DIRECTE adressée au conseiller, finissant par "?"
  ✓ "Sur tes 10 derniers contacts, combien ont débouché sur une estimation ?"
  ✓ "Quand tu sors de prospection, tu reviens avec quoi de concret ?"
  ✗ "Encourager le conseiller à mieux qualifier ses contacts" (non, c'est pas une question)
  ✗ "Le coach pourrait demander..." (non, formulation interdite)

axis = "behavior"
  → UN COMPORTEMENT OBSERVABLE chez le conseiller, formulé au présent.
  ✓ "Le conseiller multiplie les contacts mais ne formule pas de demande claire d'estimation."
  ✓ "Il évite la conversation sur l'exclusivité par peur du refus."
  ✗ "Améliorer sa prospection" (non, c'est une intention pas un comportement)

axis = "mistake"
  → UNE ERREUR OPÉRATIONNELLE CONCRÈTE, formulée comme un anti-pattern.
  ✓ "Terminer l'échange sans proposer explicitement un rendez-vous d'estimation."
  ✓ "Présenter une fourchette de prix au lieu d'un prix unique justifié."
  ✗ "Mauvaise gestion du contact" (non, trop vague)

axis = "angle"
  → UNE PISTE DE COACHING ACTIONNABLE (jeu de rôle, script, séquencement, rituel).
  ✓ "Travailler en jeu de rôle la phrase de transition vers la demande d'estimation."
  ✓ "Caler un rituel de prospection hebdomadaire avec créneaux fixes."
  ✗ "Améliorer la communication" (non, formulation bannie)

═══ CATÉGORIES AUTORISÉES ═══

expertise_id (8 et pas d'autres) :
${ALL_EXPERTISE_IDS.map((id) => `- ${id}`).join("\n")}

axis (4 et pas d'autres) :
- behavior, mistake, question, angle

═══ STRICTEMENT HORS PÉRIMÈTRE (NE JAMAIS PRODUIRE) ═══

Tu travailles UNIQUEMENT sur les ratios commerciaux immobiliers transaction listés
ci-dessous. Si une observation relève d'une de ces zones, NE PRODUIS RIEN :

- RH / recrutement / job dating / animation d'équipe au sens management
- Marketing général / communication agence / objets publicitaires
- Organisation interne / process administratif / outils internes
- Avis client global / e-réputation / notation
- Rentabilité / commissions / honoraires (sauf levier pct_exclusivite)
- Partenariats commerçants locaux / événementiel local
- "Se démarquer de la concurrence" / "communication originale" : génériques bannis

Exemples concrets de patterns à NE PAS produire :
✗ "Organiser un job dating" (HR, hors levier)
✗ "Développer des partenariats avec des commerçants locaux" (marketing, hors levier)
✗ "Comment intégrer des éléments originaux dans la communication" (marketing, vague)
✗ "Améliorer la rentabilité du portefeuille" (financier, pas levier de transaction)

Si aucun pattern réellement EXPLOITABLE pour un des 8 leviers transaction n'est
trouvé, retourner une liste vide est PRÉFÉRABLE.

═══ POLITIQUE DE REJET ═══

Mieux vaut 0 pattern qu'un pattern mal classé ou hors levier.

═══ FORMAT DE SORTIE ═══

JSON strict :
{
  "patterns": [
    { "expertise_id": "...", "axis": "behavior" | "mistake" | "question" | "angle", "text": "..." }
  ],
  "notes": "..." (optionnel, court)
}

Cible : 0 à 8 patterns par débrief. Mieux vaut 0 que du bruit.`;

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
      "HTTP-Referer": toAsciiHeader("https://nxt-performance.app"),
      // Tiret long "—" interdit par fetch (ByteString ASCII-only). Tout
      // header est passé via toAsciiHeader pour neutraliser le risque.
      "X-Title": toAsciiHeader("NXT Performance - Coach Brain Ingestion"),
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

// Phrases bannies (insensibilité à la casse) — symptômes typiques d'une
// formulation académique non actionnable. Si trouvé, le pattern est rejeté.
const BANNED_PHRASES: string[] = [
  "le coach pourrait",
  "il serait intéressant",
  "encourager le conseiller",
  "améliorer la communication",
  "se démarquer de la concurrence",
];

const MIN_TEXT_LENGTH = 8;
const MAX_TEXT_LENGTH = 220;

/**
 * Mots-clés HORS PÉRIMÈTRE — si l'un d'eux apparaît dans le texte, le
 * pattern est rejeté (sauf exception conditionnelle ci-dessous).
 *
 * Couvre les 5 zones que le LLM a tendance à inclure malgré le prompt :
 * RH, marketing général, événementiel local, finance, communication
 * "originale".
 */
const OFF_LEVER_KEYWORDS: string[] = [
  "job dating",
  "avis client",
  "commerçants locaux",
  "objets publicitaires",
  "génération de collaborateurs",
  "communication originale",
  "se démarquer",
  "rentabilité",
  "commissions",
];

/**
 * Mots-clés hors périmètre SAUF pour certains leviers spécifiques.
 * Ex : "honoraires" est rejeté SAUF si le levier est `pct_exclusivite`
 * (où la défense des honoraires fait partie du discours commercial).
 */
const OFF_LEVER_KEYWORDS_CONDITIONAL: Array<{
  keyword: string;
  allowedFor: ExpertiseRatioId[];
}> = [
  { keyword: "honoraires", allowedFor: ["pct_exclusivite"] },
];

/**
 * Mots-clés ATTENDUS par levier — chaque pattern doit contenir AU MOINS
 * un de ces mots dans son texte pour passer la validation. Filet de
 * sécurité contre les patterns transverses ou mal classés (ex. observation
 * sur la prospection mise dans `compromis_actes`).
 *
 * La comparaison est faite après normalisation NFD + strip accents +
 * lowercase, donc `exclusivité` matche `exclusivite` etc.
 */
const EXPECTED_KEYWORDS: Record<ExpertiseRatioId, string[]> = {
  contacts_estimations: [
    "contact",
    "estimation",
    "rendez-vous",
    "rdv",
    "prospection",
    "échange",
    "appel",
  ],
  estimations_mandats: [
    "estimation",
    "mandat",
    "vendeur",
    "prix",
    "r1",
    "r2",
    "signature",
  ],
  pct_exclusivite: [
    "exclusivité",
    "mandat exclusif",
    "honoraires",
    "engagement vendeur",
    "exclu",
  ],
  acheteurs_tournee: [
    "acheteur",
    "tournée",
    "découverte",
    "qualification",
    "agence",
    "mandat de recherche",
  ],
  visites_par_acheteur: [
    "visite",
    "sortie",
    "biens",
    "découverte",
    "acheteur",
  ],
  visites_offres: [
    "visite",
    "retour",
    "offre",
    "acheteur",
    "débrief",
  ],
  offres_compromis: [
    "offre",
    "compromis",
    "négociation",
    "condition",
    "financement",
    "vendeur",
  ],
  compromis_actes: [
    "compromis",
    "acte",
    "notaire",
    "délai",
    "signature",
    "suspensive",
  ],
};

/**
 * Normalisation pour matching insensible à la casse / aux accents.
 * "Exclusivité" → "exclusivite", "RDV" → "rdv".
 */
function normalizeForMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

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
    if (!isQualityPattern(text, p.axis, p.expertise_id)) continue;
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

/**
 * Validation qualité métier post-LLM. Filet de sécurité indépendant du
 * prompt — si le LLM produit quand même une formulation académique ou
 * mal alignée avec son levier, on la rejette ici.
 */
function isQualityPattern(
  text: string,
  axis: Axis,
  expertiseId: ExpertiseRatioId,
): boolean {
  // Longueur
  if (text.length < MIN_TEXT_LENGTH || text.length > MAX_TEXT_LENGTH) return false;
  // PII résiduel
  if (looksLikeProperNoun(text)) return false;
  // Formulations bannies (case-insensitive)
  const lower = text.toLowerCase();
  for (const banned of BANNED_PHRASES) {
    if (lower.includes(banned)) return false;
  }
  // Une question DOIT être une question
  if (axis === "question" && !text.trimEnd().endsWith("?")) return false;

  // Hors périmètre — RH / marketing / finance / partenariats locaux.
  const normText = normalizeForMatch(text);
  for (const kw of OFF_LEVER_KEYWORDS) {
    if (normText.includes(normalizeForMatch(kw))) return false;
  }
  // Hors périmètre conditionnel — ex. "honoraires" rejeté SAUF si le
  // levier est `pct_exclusivite`.
  for (const { keyword, allowedFor } of OFF_LEVER_KEYWORDS_CONDITIONAL) {
    if (
      normText.includes(normalizeForMatch(keyword)) &&
      !allowedFor.includes(expertiseId)
    ) {
      return false;
    }
  }

  // Alignement strict avec le levier : au moins UN mot-clé attendu doit
  // apparaître dans le texte. Évite les patterns transverses ou mal
  // classés (ex. observation prospection rangée dans `compromis_actes`).
  const expected = EXPECTED_KEYWORDS[expertiseId];
  const hasExpectedKeyword = expected.some((kw) =>
    normText.includes(normalizeForMatch(kw)),
  );
  if (!hasExpectedKeyword) return false;

  return true;
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
