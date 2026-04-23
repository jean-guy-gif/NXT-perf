// ── Extraction dictionary ──────────────────────────────────────────────────
//
// Partagé entre le parseur Excel local (fast-path) et le prompt Gemini.
// 12 champs VOLUME uniquement — aucun ratio, aucun pourcentage, aucune moyenne.

export const EXTRACTION_FIELDS = [
  "contactsTotaux",
  "rdvEstimation",
  "estimationsRealisees",
  "mandatsSignes",
  "mandatsExclusifs",
  "rdvSuivi",
  "baissePrix",
  "nombreVisites",
  "offresRecues",
  "compromisSignes",
  "actesSignes",
  "chiffreAffaires",
] as const;

export type ExtractionFieldId = (typeof EXTRACTION_FIELDS)[number];

export const FIELD_LABELS_FR: Record<ExtractionFieldId, string> = {
  contactsTotaux: "Contacts totaux",
  rdvEstimation: "RDV estimation",
  estimationsRealisees: "Estimations réalisées",
  mandatsSignes: "Mandats signés",
  mandatsExclusifs: "Mandats exclusifs",
  rdvSuivi: "RDV suivi vendeur",
  baissePrix: "Baisses de prix",
  nombreVisites: "Visites",
  offresRecues: "Offres reçues",
  compromisSignes: "Compromis signés",
  actesSignes: "Actes signés",
  chiffreAffaires: "Chiffre d'affaires",
};

// Synonymes par champ — intitulés attendus après normalisation (lowercase,
// sans accents, ponctuation en espace, espaces simples).
export const FIELD_SYNONYMS: Record<ExtractionFieldId, string[]> = {
  contactsTotaux: [
    "contacts",
    "contacts totaux",
    "contacts entrants",
    "contacts sortants",
    "contacts nets",
    "nb contacts",
    "nombre contacts",
    "appels",
    "appels entrants",
    "appels sortants",
    "mails",
    "emails",
    "messages",
    "conversations",
    "discussions",
    "leads",
    "prospects",
    "relances",
    "prospection active",
    "prospection",
    "portail",
  ],
  rdvEstimation: [
    "rdv estimation",
    "rdv estim",
    "rendez vous estimation",
    "r1",
    "rdv r1",
    "rdv decouverte",
    "visite estimation",
    "visite d estimation",
    "decouverte",
  ],
  estimationsRealisees: [
    "estimations realisees",
    "estimations",
    "estims",
    "avis de valeur",
    "avis valeur",
    "evaluations",
    "adv",
  ],
  mandatsSignes: [
    "mandats signes",
    "mandats",
    "nb mandats",
    "nombre mandats",
    "prises de mandat",
    "prises mandat",
    "ms",
    "me",
    "mex",
    "mes",
    "simple",
    "mandat simple",
    "mandats simples",
    "exclu",
    "exclusif",
    "mandat exclusif",
    "mandats exclusifs",
  ],
  mandatsExclusifs: [
    "mandats exclusifs",
    "mandat exclusif",
    "exclu",
    "exclus",
    "exclusif",
    "exclusifs",
    "me",
    "mex",
    "mandats me",
  ],
  rdvSuivi: [
    "rdv suivi",
    "r2",
    "rdv r2",
    "rappel vendeur",
    "point vendeur",
    "suivi mandat",
    "suivi vendeur",
    "bilan mandat",
  ],
  baissePrix: [
    "baisse prix",
    "baisses prix",
    "baisse de prix",
    "baisses de prix",
    "ajustement prix",
    "ajustements prix",
    "renego prix",
    "renegociations prix",
    "bp",
  ],
  nombreVisites: [
    "visites",
    "nb visites",
    "nombre visites",
    "visites realisees",
    "visites acheteurs",
    "sorties visite",
    "tours",
    "rdv acheteur",
    "rdv acheteurs",
  ],
  offresRecues: [
    "offres",
    "offres recues",
    "offre recue",
    "offres d achat",
    "offre d achat",
    "oai",
    "propositions",
    "propositions achat",
  ],
  compromisSignes: [
    "compromis",
    "compromis signes",
    "compromis signe",
    "ssp",
    "avant contrats",
    "avant contrat",
    "promesses",
    "promesse",
    "aa",
    "actes sous seing prive",
  ],
  actesSignes: [
    "actes",
    "actes signes",
    "actes authentiques",
    "signatures definitives",
    "signature definitive",
    "ventes finalisees",
    "ventes",
    "vente",
  ],
  chiffreAffaires: [
    "ca",
    "chiffre affaires",
    "chiffre d affaires",
    "commissions",
    "honoraires",
    "ht",
    "ca ht",
    "revenus",
    "revenu",
  ],
};

// Abréviations explicites — matching exact uniquement, sensibles au contexte.
// Utilisées pour des cellules courtes (1-3 caractères) où le substring match
// serait trop permissif.
export const ABBREVIATIONS: Record<string, ExtractionFieldId> = {
  ms: "mandatsSignes",
  me: "mandatsExclusifs",
  mex: "mandatsExclusifs",
  mes: "mandatsSignes",
  r1: "rdvEstimation",
  r2: "rdvSuivi",
  bp: "baissePrix",
  oai: "offresRecues",
  ssp: "compromisSignes",
  aa: "compromisSignes",
  adv: "estimationsRealisees",
  ca: "chiffreAffaires",
  ht: "chiffreAffaires",
};

// Regex pour détecter un ratio/pourcentage/taux — on IGNORE ces cellules.
// Couvre : taux, tx, t., ratio, %, pourcent, moyenne, moy, délai, conversion,
// transformation, rate (EN), per/par (taux par X).
const RATIO_PATTERN =
  /(^|\s)(taux|tx|ratio|pct|pourcent|pourcentage|moyenne|moy|%|delai|conversion|transformation|rate|efficacite|performance)\b/i;

export function looksLikeRatio(label: string): boolean {
  if (label.includes("%")) return true;
  if (RATIO_PATTERN.test(label)) return true;
  // "t." ou "t " en début → taux abrégé
  if (/^t[\s.]/i.test(label)) return true;
  return false;
}

export function normalizeLabel(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['`´]/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type MatchResult = {
  field: ExtractionFieldId | null;
  confidence: number; // 0..1
};

// Match un label normalisé à un champ.
// - Match exact sur synonyme complet → 0.95
// - Abréviation exacte (label = abbr) → 0.90
// - Substring: synonyme ⊂ label → 0.75
// - Substring: label ⊂ synonyme (label court, ≥ 4 chars) → 0.60
export function matchLabel(normalized: string): MatchResult {
  if (!normalized || looksLikeRatio(normalized)) {
    return { field: null, confidence: 0 };
  }

  // 1. Abréviation exacte (cellule courte)
  if (normalized.length <= 4 && ABBREVIATIONS[normalized]) {
    return { field: ABBREVIATIONS[normalized], confidence: 0.9 };
  }

  let best: MatchResult = { field: null, confidence: 0 };

  for (const field of EXTRACTION_FIELDS) {
    for (const syn of FIELD_SYNONYMS[field]) {
      if (normalized === syn) {
        // Exact → meilleur possible, on retourne direct
        return { field, confidence: 0.95 };
      }
      // Substring: synonyme présent dans le label (ex: "nb contacts nets" contient "contacts")
      if (syn.length >= 3 && normalized.includes(syn)) {
        const conf = 0.75 + Math.min(0.1, syn.length / 100);
        if (conf > best.confidence) best = { field, confidence: conf };
      }
      // Inverse: label court inclus dans synonyme (rare)
      if (normalized.length >= 4 && syn.includes(normalized)) {
        const conf = 0.6;
        if (conf > best.confidence) best = { field, confidence: conf };
      }
    }
  }

  return best;
}

// Synonymes formatés pour injection dans le prompt Gemini.
export function buildSynonymListForPrompt(): string {
  return EXTRACTION_FIELDS.map((f) => {
    const syns = FIELD_SYNONYMS[f].join(", ");
    return `- ${f} (${FIELD_LABELS_FR[f]}): ${syns}`;
  }).join("\n");
}
