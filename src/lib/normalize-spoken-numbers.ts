/**
 * Normalize spoken French numbers to digits.
 * Handles 1–1000, compounds (vingt-cinq, quatre-vingt-dix-sept), etc.
 */

const UNITS: Record<string, number> = {
  zéro: 0, zero: 0,
  un: 1, une: 1,
  deux: 2, trois: 3, quatre: 4, cinq: 5,
  six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15,
  seize: 16, "dix-sept": 17, "dix-huit": 18, "dix-neuf": 19,
};

const TENS: Record<string, number> = {
  vingt: 20, trente: 30, quarante: 40, cinquante: 50,
  soixante: 60,
};

/**
 * Parse a single French number phrase (e.g. "quatre-vingt-dix-sept") → 97
 * Returns null if not a recognizable number.
 */
function parseFrenchNumber(phrase: string): number | null {
  const p = phrase.trim().toLowerCase().replace(/\s+/g, "-");
  if (!p) return null;

  // Direct match (units 0-19)
  if (p in UNITS) return UNITS[p];
  if (p in TENS) return TENS[p];

  // "mille" alone
  if (p === "mille") return 1000;
  // "cent" alone
  if (p === "cent") return 100;

  // "deux-cents", "trois-cents", etc.
  const centMatch = p.match(/^(\w+)-cents?$/);
  if (centMatch) {
    const multiplier = UNITS[centMatch[1]];
    if (multiplier !== undefined && multiplier >= 2) return multiplier * 100;
  }

  // Quatre-vingt(s) = 80
  if (p === "quatre-vingts" || p === "quatre-vingt") return 80;

  // Quatre-vingt-X (80+X where X is 1-19)
  const qvMatch = p.match(/^quatre-vingts?-(.+)$/);
  if (qvMatch) {
    const rest = parseFrenchNumber(qvMatch[1]);
    if (rest !== null && rest >= 1 && rest <= 19) return 80 + rest;
  }

  // Soixante-dix (70), soixante-et-onze (71), soixante-douze (72)...
  const sMatch = p.match(/^soixante-(?:et-)?(.+)$/);
  if (sMatch) {
    const rest = parseFrenchNumber(sMatch[1]);
    if (rest !== null && rest >= 10 && rest <= 19) return 60 + rest;
  }

  // Tens + et + un/une: "vingt-et-un" → 21
  const etMatch = p.match(/^(\w+)-et-(un|une)$/);
  if (etMatch && etMatch[1] in TENS) {
    return TENS[etMatch[1]] + 1;
  }

  // Tens + unit: "vingt-cinq" → 25
  const compoundMatch = p.match(/^(\w+)-(\w+)$/);
  if (compoundMatch) {
    const tens = TENS[compoundMatch[1]];
    const unit = UNITS[compoundMatch[2]];
    if (tens !== undefined && unit !== undefined && unit >= 1 && unit <= 9) {
      return tens + unit;
    }
  }

  // cent-X: "cent-vingt" → 120, "cent-cinquante-trois" → 153
  const centPrefixMatch = p.match(/^cent-(.+)$/);
  if (centPrefixMatch) {
    const rest = parseFrenchNumber(centPrefixMatch[1]);
    if (rest !== null && rest >= 1 && rest <= 99) return 100 + rest;
  }

  // N-cent(s)-X: "deux-cent-trente" → 230
  const nCentMatch = p.match(/^(\w+)-cents?(?:-(.+))?$/);
  if (nCentMatch) {
    const multiplier = UNITS[nCentMatch[1]];
    if (multiplier !== undefined && multiplier >= 2) {
      const base = multiplier * 100;
      if (!nCentMatch[2]) return base;
      const rest = parseFrenchNumber(nCentMatch[2]);
      if (rest !== null && rest >= 1 && rest <= 99) return base + rest;
    }
  }

  // mille-X: "mille-deux-cent" → 1200 (out of scope but handle simple)
  // We keep scope to 1000 max as specified

  return null;
}

/**
 * Replace spoken French numbers with their digit equivalents in a text string.
 * Only replaces whole-word matches (word boundaries).
 *
 * Examples:
 * - "j'ai eu un contact" → "j'ai eu 1 contact"
 * - "vingt-cinq mandats" → "25 mandats"
 * - "quatre-vingt-dix compromis" → "90 compromis"
 */
export function normalizeSpokenNumbers(text: string): string {
  // Build patterns from longest to shortest to avoid partial matches
  const allPatterns: { pattern: string; value: number }[] = [];

  // Quatre-vingt-dix-X (90-99)
  for (const [name, val] of Object.entries(UNITS)) {
    if (val >= 1 && val <= 9) {
      allPatterns.push({ pattern: `quatre-vingts?-dix-${name}`, value: 90 + val });
    }
  }
  allPatterns.push({ pattern: "quatre-vingts?-dix", value: 90 });

  // Quatre-vingt-X (81-89)
  for (const [name, val] of Object.entries(UNITS)) {
    if (val >= 1 && val <= 19) {
      allPatterns.push({ pattern: `quatre-vingts?-${name}`, value: 80 + val });
    }
  }
  allPatterns.push({ pattern: "quatre-vingts?", value: 80 });

  // Soixante-dix-X (70-79)
  for (const [name, val] of Object.entries(UNITS)) {
    if (val >= 10 && val <= 19 && name !== "dix") {
      allPatterns.push({ pattern: `soixante-(?:et-)?${name}`, value: 60 + val });
    }
  }
  allPatterns.push({ pattern: "soixante-(?:et-)?dix", value: 70 });

  // Regular tens + unit compounds
  for (const [tensName, tensVal] of Object.entries(TENS)) {
    if (tensName === "soixante") continue; // handled above with 70+
    allPatterns.push({ pattern: `${tensName}-et-une?`, value: tensVal + 1 });
    for (const [unitName, unitVal] of Object.entries(UNITS)) {
      if (unitVal >= 2 && unitVal <= 9) {
        allPatterns.push({ pattern: `${tensName}-${unitName}`, value: tensVal + unitVal });
      }
    }
  }

  // Standalone tens
  for (const [name, val] of Object.entries(TENS)) {
    allPatterns.push({ pattern: name, value: val });
  }

  // 100, mille
  allPatterns.push({ pattern: "mille", value: 1000 });
  allPatterns.push({ pattern: "cent", value: 100 });

  // Units 0-19 (standalone last to avoid matching parts of compounds)
  for (const [name, val] of Object.entries(UNITS)) {
    allPatterns.push({ pattern: name, value: val });
  }

  // Sort by pattern length descending so longer matches are tried first
  allPatterns.sort((a, b) => b.pattern.length - a.pattern.length);

  let result = text;
  for (const { pattern, value } of allPatterns) {
    // Word boundary: preceded by start/space/punctuation, followed by end/space/punctuation
    const regex = new RegExp(`(?<=^|[\\s,.;:!?'\\-])${pattern}(?=$|[\\s,.;:!?'\\-])`, "gi");
    result = result.replace(regex, String(value));
  }

  return result;
}
