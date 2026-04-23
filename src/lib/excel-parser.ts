// ── Excel fast-path parser ─────────────────────────────────────────────────
//
// Parsing local rapide (pas d'appel LLM) pour les fichiers Excel/CSV.
// Si peu de champs sont remplis, le route handler bascule sur Gemini en
// fallback avec le CSV agrégé en contexte.

import * as XLSX from "xlsx";
import {
  EXTRACTION_FIELDS,
  FIELD_SYNONYMS,
  looksLikeRatio,
  matchLabel,
  normalizeLabel,
  type ExtractionFieldId,
} from "./extraction-dictionary";

export type FieldResult = { value: number | null; confidence: number };

export type UnknownLabel = {
  rawLabel: string;
  sheetName?: string;
  rowNumber?: number;
  columnLetter?: string;
  suggestedField?: ExtractionFieldId;
};

export type ExcelExtractionResult = {
  fields: Record<ExtractionFieldId, FieldResult>;
  unknownLabels: UnknownLabel[];
  sheetsRead: string[];
  sheetsSkipped: string[];
  /** CSV concaténé de tous les onglets — pour fallback Gemini si besoin */
  csvDump: string;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function emptyFields(): Record<ExtractionFieldId, FieldResult> {
  const out = {} as Record<ExtractionFieldId, FieldResult>;
  for (const f of EXTRACTION_FIELDS) out[f] = { value: null, confidence: 0 };
  return out;
}

function coerceNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return isNaN(v) ? null : v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.,\-]/g, "").replace(/\s/g, "").replace(",", ".");
    if (!cleaned) return null;
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }
  return null;
}

function extractYearFromSheetName(name: string): number | null {
  const match = name.match(/(20\d{2})/);
  return match ? parseInt(match[1], 10) : null;
}

// Une feuille est "skip" si elle n'a quasi pas de données numériques,
// ou si son nom suggère de l'analyse/commentaire (objectifs, analyse, notes…)
function shouldSkipSheet(name: string, rows: Record<string, unknown>[]): boolean {
  const normalized = normalizeLabel(name);
  const skipKeywords = ["analyse", "objectif", "notes", "commentaires", "lisez moi", "readme"];
  if (skipKeywords.some((k) => normalized.includes(k))) return true;
  if (rows.length === 0) return true;

  // Compte les cellules numériques
  let numericCount = 0;
  for (const row of rows) {
    for (const v of Object.values(row)) {
      if (coerceNumber(v) !== null) numericCount++;
    }
  }
  return numericCount < 2;
}

// ── Stratégie par feuille ──────────────────────────────────────────────────
//
// Strategy A (horizontal): les en-têtes de colonnes sont les noms de champs.
//   ex: | Contacts | Mandats | Visites |
//       |   120    |   30    |   80    |
//   Pour chaque colonne qui matche un champ, on somme les lignes.
//
// Strategy B (vertical): la première colonne = label, la seconde = valeur.
//   ex: | Contacts         | 120 |
//       | Mandats signés   | 30  |
//   Pour chaque ligne dont le label matche un champ, on prend la valeur.

type SheetExtraction = {
  fields: Partial<Record<ExtractionFieldId, { value: number; confidence: number }>>;
  unknowns: UnknownLabel[];
  /** Nombre de cellules remplies — pour arbitrage multi-onglets */
  filledRowCount: number;
};

function parseSheet(
  sheetName: string,
  sheet: XLSX.WorkSheet,
): SheetExtraction {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    blankrows: false,
  });
  const result: SheetExtraction = { fields: {}, unknowns: [], filledRowCount: 0 };
  if (rows.length === 0) return result;

  const headers = Object.keys(rows[0]);

  // ── Strategy A ────────────────────────────────────────────────────────
  for (let colIdx = 0; colIdx < headers.length; colIdx++) {
    const header = headers[colIdx];
    const normalized = normalizeLabel(header);
    if (!normalized || looksLikeRatio(normalized)) continue;

    const match = matchLabel(normalized);
    if (!match.field) {
      // Collecter comme unknown si ça ressemble à un label (pas une date, pas un nombre)
      if (normalized.length >= 3 && /[a-z]/.test(normalized) && !/^\d/.test(normalized)) {
        result.unknowns.push({
          rawLabel: header,
          sheetName,
          columnLetter: XLSX.utils.encode_col(colIdx),
        });
      }
      continue;
    }

    let total = 0;
    let seen = 0;
    for (const row of rows) {
      const n = coerceNumber(row[header]);
      if (n !== null) {
        total += n;
        seen++;
      }
    }
    if (seen > 0) {
      const existing = result.fields[match.field];
      // Si déjà présent sur cette feuille (double synonyme qui matche), garder le plus confiant
      if (!existing || match.confidence > existing.confidence) {
        result.fields[match.field] = { value: total, confidence: match.confidence };
      }
      result.filledRowCount += seen;
    }
  }

  // ── Strategy B ────────────────────────────────────────────────────────
  if (headers.length >= 2) {
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      const labelRaw = String(row[headers[0]] ?? "").trim();
      if (!labelRaw) continue;
      const normalized = normalizeLabel(labelRaw);
      if (!normalized || looksLikeRatio(normalized)) continue;

      // Trouver la première colonne numérique à droite
      let value: number | null = null;
      for (let i = 1; i < headers.length; i++) {
        value = coerceNumber(row[headers[i]]);
        if (value !== null) break;
      }
      if (value === null) continue;

      const match = matchLabel(normalized);
      if (!match.field) {
        if (normalized.length >= 3 && /[a-z]/.test(normalized) && !/^\d/.test(normalized)) {
          result.unknowns.push({
            rawLabel: labelRaw,
            sheetName,
            rowNumber: rowIdx + 2, // +1 pour 1-indexed, +1 pour skip header row
          });
        }
        continue;
      }

      const existing = result.fields[match.field];
      if (!existing) {
        result.fields[match.field] = { value, confidence: match.confidence };
      } else if (match.confidence > existing.confidence) {
        result.fields[match.field] = { value, confidence: match.confidence };
      } else if (match.confidence === existing.confidence) {
        // Additionner si même confiance (ex: plusieurs lignes "compromis" sur la même feuille)
        existing.value += value;
      }
      result.filledRowCount++;
    }
  }

  return result;
}

// ── Arbitrage multi-onglets ────────────────────────────────────────────────
//
// Pour chaque champ, si plusieurs feuilles l'ont capté :
// 1. Préférer la feuille dont le titre contient l'année la plus récente
// 2. Si ambigu (année égale ou absente), préférer celle avec le plus de
//    cellules remplies (filledRowCount le plus élevé)
// 3. En dernier recours, garder le score de confiance le plus haut

function mergeSheetResults(
  perSheet: Array<{ name: string; result: SheetExtraction }>,
): Record<ExtractionFieldId, FieldResult> {
  const merged = emptyFields();

  for (const field of EXTRACTION_FIELDS) {
    const candidates = perSheet
      .filter((s) => s.result.fields[field] !== undefined)
      .map((s) => ({
        sheetName: s.name,
        year: extractYearFromSheetName(s.name) ?? 0,
        filledRowCount: s.result.filledRowCount,
        value: s.result.fields[field]!.value,
        confidence: s.result.fields[field]!.confidence,
      }));

    if (candidates.length === 0) continue;

    candidates.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      if (b.filledRowCount !== a.filledRowCount)
        return b.filledRowCount - a.filledRowCount;
      return b.confidence - a.confidence;
    });

    merged[field] = {
      value: candidates[0].value,
      confidence: candidates[0].confidence,
    };
  }

  return merged;
}

// ── Post-processing: règle MS/ME ───────────────────────────────────────────
//
// Si on a capté mandatsExclusifs mais pas mandatsSignes, on suppose que
// mandatsSignes = mandatsExclusifs (cas "seule la colonne Exclu est présente").
// Si on a capté les deux, on garde tel quel — l'utilisateur peut ajuster.

function applyMandatsRule(
  fields: Record<ExtractionFieldId, FieldResult>,
): void {
  const ms = fields.mandatsSignes;
  const me = fields.mandatsExclusifs;

  // Garde-fou : si ME > MS, on garde MS (l'utilisateur ajustera) mais
  // on baisse la confiance — cas probablement mal interprété.
  if (ms.value !== null && me.value !== null && me.value > ms.value) {
    fields.mandatsSignes.confidence = Math.min(ms.confidence, 0.5);
    fields.mandatsExclusifs.confidence = Math.min(me.confidence, 0.5);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

export function parseExcelRobust(buffer: Buffer): ExcelExtractionResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetsRead: string[] = [];
  const sheetsSkipped: string[] = [];
  const perSheet: Array<{ name: string; result: SheetExtraction }> = [];
  const csvParts: string[] = [];

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      blankrows: false,
    });

    // CSV dump pour fallback Gemini (on dump TOUS les onglets, même ignorés)
    csvParts.push(`--- ${name} ---\n${XLSX.utils.sheet_to_csv(sheet)}`);

    if (shouldSkipSheet(name, rows)) {
      sheetsSkipped.push(name);
      continue;
    }

    sheetsRead.push(name);
    perSheet.push({ name, result: parseSheet(name, sheet) });
  }

  const fields = mergeSheetResults(perSheet);
  applyMandatsRule(fields);

  // Dédupliquer les unknowns par rawLabel (un même intitulé sur plusieurs
  // feuilles = une seule ligne remontée)
  const seenLabels = new Set<string>();
  const unknownLabels: UnknownLabel[] = [];
  for (const s of perSheet) {
    for (const u of s.result.unknowns) {
      const key = normalizeLabel(u.rawLabel);
      if (!seenLabels.has(key)) {
        seenLabels.add(key);
        unknownLabels.push(u);
      }
    }
  }

  return {
    fields,
    unknownLabels,
    sheetsRead,
    sheetsSkipped,
    csvDump: csvParts.join("\n\n"),
  };
}

// ── Combien de champs ont été extraits ? ───────────────────────────────────

export function countFilledFields(
  fields: Record<ExtractionFieldId, FieldResult>,
): number {
  return EXTRACTION_FIELDS.filter((f) => fields[f].value !== null).length;
}

// Garde-fou : les synonymes listés doivent couvrir les 12 champs
if (process.env.NODE_ENV !== "production") {
  for (const f of EXTRACTION_FIELDS) {
    if (!FIELD_SYNONYMS[f] || FIELD_SYNONYMS[f].length === 0) {
      throw new Error(`Missing synonyms for extraction field: ${f}`);
    }
  }
}
