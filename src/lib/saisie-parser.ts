/**
 * Strict Controlled Parser for weekly performance voice entry.
 *
 * MODE: STRICT CONTROLE
 * - Accept only responses containing a single interpretable numeric value
 * - Accept atomic forms and short phrases with one clear quantity
 * - Reject ambiguous, multiple, or unexploitable responses
 * - Standard relance: "Combien ?"
 *
 * Accepted: "un" → 1, "j'en ai fait un" → 1, "aucun cette semaine" → 0, "3" → 3
 * Rejected: "1 ou 2", "j'en ai fait un ou deux", "oui"
 */

// ── Zero expressions (full-string or prefix matches) ─────────────────────────

const ZERO_EXPRESSIONS = [
  /^(0|zéro|zero)$/,
  /^(rien|non|pas|aucun|aucune)$/,
  /^pas du tout$/,
  /^j'en ai pas$/,
  /^je n'en ai pas$/,
  /^j'ai rien$/,
  /^non rien$/,
  /^aucune?\b/,
];

// ── Ambiguity patterns (multiple values or hesitation) ───────────────────────

const AMBIGUITY_PATTERNS = [
  /\bou\b/,           // "1 ou 2", "un ou deux"
  /\bpeut-être\b/,    // "peut-être 3"
  /\benviron\b/,      // "environ 5" — could be accepted but ambiguous intent
  /\bje sais pas\b/,
  /\bje ne sais pas\b/,
  /\bà peu près\b/,
];

// ── French number words (whole-word only) ────────────────────────────────────

const WORD_NUMBERS: [RegExp, number][] = [
  [/\bune?\b/, 1],
  [/\bdeux\b/, 2],
  [/\btrois\b/, 3],
  [/\bquatre\b/, 4],
  [/\bcinq\b/, 5],
  [/\bsix\b/, 6],
  [/\bsept\b/, 7],
  [/\bhuit\b/, 8],
  [/\bneuf\b/, 9],
  [/\bdix\b/, 10],
  [/\bonze\b/, 11],
  [/\bdouze\b/, 12],
  [/\btreize\b/, 13],
  [/\bquatorze\b/, 14],
  [/\bquinze\b/, 15],
  [/\bseize\b/, 16],
  [/\bdix[- ]?sept\b/, 17],
  [/\bdix[- ]?huit\b/, 18],
  [/\bdix[- ]?neuf\b/, 19],
  [/\bvingt\b/, 20],
  [/\btrente\b/, 30],
];

const APPROXIMATE_WORDS: [RegExp, number][] = [
  [/\bdizaine\b/, 10],
  [/\bdouzaine\b/, 12],
  [/\bquinzaine\b/, 15],
  [/\bvingtaine\b/, 20],
  [/\btrentaine\b/, 30],
];

// ── Types ────────────────────────────────────────────────────────────────────

export type ParseDecision = "accepted" | "ambiguous" | "rejected";

export type ParseResult =
  | { type: "number"; value: number; decision: "accepted" }
  | { type: "yes"; decision: "rejected" }
  | { type: "ambiguous"; decision: "ambiguous" }
  | { type: "invalid"; decision: "rejected" };

// ── Normalize ────────────────────────────────────────────────────────────────

/**
 * Normalize raw STT text for robust parsing.
 * NFKC + invisible chars + lowercase + punctuation + apostrophes + whitespace.
 */
export function normalize(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u200B\u200C\u200D\uFEFF\u00AD\u200E\u200F]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?…»«"]+$/g, "")
    .replace(/[\u2018\u2019\u201A\u201B\u02BC\u0060\u00B4]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Core parser — STRICT CONTROLE ────────────────────────────────────────────

/**
 * Parse a voice/text response into a number.
 * Single numeric intent only. Ambiguous or multi-value → rejected.
 */
export function parseNumericResponse(raw: string): ParseResult {
  const text = normalize(raw);
  if (!text) return { type: "invalid", decision: "rejected" };

  // 1. Exact "un" / "une" — highest priority, most fragile
  if (text === "un" || text === "une") {
    return { type: "number", value: 1, decision: "accepted" };
  }

  // 2. Zero expressions
  for (const re of ZERO_EXPRESSIONS) {
    if (re.test(text)) return { type: "number", value: 0, decision: "accepted" };
  }

  // 3. "oui" / "ouais" → rejected (not a quantity)
  if (/^oui$/.test(text) || /^ouais$/.test(text) || /^oui oui$/.test(text)) {
    return { type: "yes", decision: "rejected" };
  }

  // 4. Ambiguity check — BEFORE number extraction
  for (const re of AMBIGUITY_PATTERNS) {
    if (re.test(text)) return { type: "ambiguous", decision: "ambiguous" };
  }

  // 5. Multiple digit groups → ambiguous ("1 2", "3 et 5")
  const allDigits = text.match(/\d+/g);
  if (allDigits && allDigits.length > 1) {
    return { type: "ambiguous", decision: "ambiguous" };
  }

  // 6. Single digit → accepted
  if (allDigits && allDigits.length === 1) {
    return { type: "number", value: parseInt(allDigits[0], 10), decision: "accepted" };
  }

  // 7. Multiple word-numbers in the same text → ambiguous
  let wordNumberCount = 0;
  let lastWordValue = 0;
  for (const [re, val] of WORD_NUMBERS) {
    if (re.test(text)) { wordNumberCount++; lastWordValue = val; }
  }
  if (wordNumberCount > 1) {
    return { type: "ambiguous", decision: "ambiguous" };
  }

  // 8. Single word-number → accepted
  if (wordNumberCount === 1) {
    return { type: "number", value: lastWordValue, decision: "accepted" };
  }

  // 9. Approximate words
  for (const [re, val] of APPROXIMATE_WORDS) {
    if (re.test(text)) return { type: "number", value: val, decision: "accepted" };
  }

  // 10. Nothing recognized
  return { type: "invalid", decision: "rejected" };
}

// ── Display formatting (capitalize names for UI) ─────────────────────────────

/** Capitalize first letter of each word: "dupont retraite" → "Dupont Retraite" */
export function capitalizeWords(text: string): string {
  return text.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

/** Capitalize just the first letter: "dupont" → "Dupont" */
export function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ── Count field parser (strict controle) ─────────────────────────────────────

/**
 * Parse a count field response.
 * Returns the number if accepted, null if rejected/ambiguous (caller relances).
 */
export function parseCountField(raw: string): number | null {
  const result = parseNumericResponse(raw);
  if (result.type === "number") return result.value;
  return null; // ambiguous, yes, or invalid → relance
}

// ── Detail parsers ──────────────────────────────────────────────────────────
//
// Note : le parser de mandats nommés a été retiré avec la refonte saisie v2.
// Les mandats sont désormais saisis sous forme de deux compteurs (simples /
// exclusifs), pas de noms.

export interface ParsedDetail {
  nom: string;
  commentaire: string;
}

export function parseDetailsText(text: string): ParsedDetail[] {
  const cleaned = normalize(text);
  if (!cleaned) return [];
  const zero = parseNumericResponse(cleaned);
  if (zero.type === "number" && zero.value === 0) return [];

  return cleaned.split(/[,;]+/).flatMap(s => s.split(/\s+et\s+/)).map(s => {
    const trimmed = s.trim();
    if (!trimmed) return null;
    const idx = trimmed.indexOf(" ");
    if (idx > 0) return { nom: trimmed.slice(0, idx), commentaire: trimmed.slice(idx + 1).trim() };
    return { nom: trimmed, commentaire: "" };
  }).filter((v): v is ParsedDetail => v !== null && v.nom.length > 0);
}
