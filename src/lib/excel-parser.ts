// ── Excel fast-path parser ─────────────────────────────────────────────────
//
// Parsing local rapide (pas d'appel LLM) pour les fichiers Excel/CSV.
//
// Détection intelligente de la ligne d'en-tête : les fichiers business ont
// typiquement un titre mergé en ligne 1, un sous-titre en ligne 2, une
// ligne vide, puis le vrai header. On scanne les 10 premières lignes et
// on choisit celle qui matche le plus de synonymes connus.
//
// Si aucune ligne ne matche (≥ 3 cellules reconnues), on retourne un
// résultat vide : le route handler bascule sur Gemini en fallback.

import * as XLSX from "xlsx";
import {
  EXTRACTION_FIELDS,
  FIELD_SYNONYMS,
  isMetadataLabel,
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

const HEADER_SCAN_ROWS = 10;
const MIN_HEADER_MATCHES = 3;

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
    // Une formule non calculée arrive en string : on ignore.
    if (v.startsWith("=")) return null;
    const cleaned = v
      .replace(/[^\d.,\-]/g, "")
      .replace(/\s/g, "")
      .replace(",", ".");
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

function isTotalLabel(normalized: string): boolean {
  if (!normalized) return true; // ligne sans label → considérée terminale
  return /^(total|totaux|somme|cumul|grand total|moyenne|moy|ytd)/.test(
    normalized,
  );
}

function isGarbageLabel(raw: string): boolean {
  const r = raw.trim();
  if (!r) return true;
  // SheetJS génère __EMPTY, __EMPTY_1, etc. quand la première ligne a des
  // cellules vides : on ne veut pas les remonter comme unknowns.
  if (/^__EMPTY(_\d+)?$/.test(r)) return true;
  // Labels purement numériques (dates, n° de semaine)
  if (/^\d+(\.\d+)?$/.test(r)) return true;
  // Dates format typique
  if (/^\d{1,2}[\/\-]\d{1,2}/.test(r)) return true;
  return false;
}

// ── Feuille à ignorer (titre parle d'analyse/objectif/notes) ────────────────

function shouldSkipSheetByName(name: string): boolean {
  const normalized = normalizeLabel(name);
  const skipKeywords = [
    "analyse",
    "objectif",
    "notes",
    "commentaires",
    "lisez moi",
    "readme",
    "historique",
    "legende",
    "doc",
  ];
  return skipKeywords.some((k) => normalized.includes(k));
}

// ── Détection de la ligne d'en-tête ────────────────────────────────────────
//
// On scanne les N premières lignes et on compte combien de cellules sur
// chaque ligne matchent un synonyme du dictionnaire. La ligne gagnante doit
// avoir ≥ MIN_HEADER_MATCHES matches. Sinon on retourne -1 et le caller
// bascule sur Gemini.

function detectHeaderRow(aoa: unknown[][]): {
  row: number;
  matches: number;
} {
  let bestRow = -1;
  let bestMatches = 0;

  const scanLimit = Math.min(HEADER_SCAN_ROWS, aoa.length);
  for (let i = 0; i < scanLimit; i++) {
    const row = aoa[i] ?? [];
    let matches = 0;
    for (const cell of row) {
      const raw = cell == null ? "" : String(cell).trim();
      if (!raw) continue;
      if (isGarbageLabel(raw)) continue;
      const normalized = normalizeLabel(raw);
      if (!normalized || normalized.length < 2) continue;
      if (looksLikeRatio(normalized)) continue;
      const m = matchLabel(normalized);
      if (m.field) matches++;
    }
    if (matches > bestMatches) {
      bestMatches = matches;
      bestRow = i;
    }
  }

  return { row: bestRow, matches: bestMatches };
}

// ── Stratégie par feuille ──────────────────────────────────────────────────
//
// Une fois la ligne d'en-tête détectée, on applique deux stratégies :
//
// Strategy A (horizontal) : les cellules du header sont des noms de champs.
//   Pour chaque colonne matchée, on somme les valeurs des lignes de données.
//   On arrête de sommer dès qu'on atteint une ligne "Total"/"Somme".
//
// Strategy B (vertical) : premier col = label, colonnes suivantes = valeurs.
//   Pour chaque ligne data dont le label matche un champ, on prend la
//   première valeur numérique.

type SheetExtraction = {
  fields: Partial<
    Record<ExtractionFieldId, { value: number; confidence: number }>
  >;
  unknowns: UnknownLabel[];
  filledRowCount: number;
};

function parseSheetAOA(
  sheetName: string,
  aoa: unknown[][],
): SheetExtraction {
  const result: SheetExtraction = {
    fields: {},
    unknowns: [],
    filledRowCount: 0,
  };
  if (aoa.length === 0) return result;

  const header = detectHeaderRow(aoa);
  if (header.row < 0 || header.matches < MIN_HEADER_MATCHES) {
    return result;
  }

  const headerRow = aoa[header.row];
  const dataStart = header.row + 1;

  // Collecter les unknowns (header cells non matchées)
  for (let colIdx = 0; colIdx < headerRow.length; colIdx++) {
    const cell = headerRow[colIdx];
    const raw = cell == null ? "" : String(cell).trim();
    if (!raw) continue;
    if (isGarbageLabel(raw)) continue;
    const normalized = normalizeLabel(raw);
    if (!normalized || normalized.length < 3) continue;
    if (looksLikeRatio(normalized)) continue; // colonnes ratio → intentionnellement ignorées
    if (isMetadataLabel(normalized)) continue; // colonnes structurelles → ignorées silencieusement
    const m = matchLabel(normalized);
    if (!m.field) {
      // Label qui ressemble à du métier mais non mappé
      if (/[a-z]/.test(normalized) && !/^\d/.test(normalized)) {
        result.unknowns.push({
          rawLabel: raw,
          sheetName,
          columnLetter: XLSX.utils.encode_col(colIdx),
        });
      }
    }
  }

  // Déterminer les lignes data (arrêter au premier Total)
  const dataRows: { row: unknown[]; sheetRowNumber: number }[] = [];
  for (let i = dataStart; i < aoa.length; i++) {
    const row = aoa[i] ?? [];
    // Row totalement vide → on s'arrête
    const hasAny = row.some((c) => c != null && String(c).trim() !== "");
    if (!hasAny) break;

    // Label de la première colonne → si "Total"/"Somme" etc., on s'arrête
    const firstCell = String(row[0] ?? "").trim();
    if (firstCell) {
      const normalizedFirst = normalizeLabel(firstCell);
      if (isTotalLabel(normalizedFirst) && normalizedFirst !== "") {
        // On saute cette ligne ET on arrête (les totaux sont toujours en bas)
        break;
      }
    }
    dataRows.push({ row, sheetRowNumber: i + 1 });
  }

  if (dataRows.length === 0) return result;

  // DEBUG temporaire (à retirer après validation off-by-one) — sortie dans
  // runtime logs Vercel. Non émis en tests vitest (NODE_ENV=test).
  if (process.env.NODE_ENV !== "test") {
    const headerPreview = headerRow
      .map((c) => (c == null ? "" : String(c).slice(0, 20)))
      .join(" | ");
    const firstDataRowPreview = dataRows[0]?.row
      .map((c) => (c == null ? "" : String(c).slice(0, 10)))
      .join(" | ");
    const lastDataRowPreview =
      dataRows[dataRows.length - 1]?.row
        .map((c) => (c == null ? "" : String(c).slice(0, 10)))
        .join(" | ") ?? "";
    console.log(
      `[parser] sheet="${sheetName}" headerRow=${header.row + 1} dataRows=${dataRows.length} header="${headerPreview}" first="${firstDataRowPreview}" last="${lastDataRowPreview}"`,
    );
  }

  // ── Strategy A ────────────────────────────────────────────────────────
  for (let colIdx = 0; colIdx < headerRow.length; colIdx++) {
    const cell = headerRow[colIdx];
    const raw = cell == null ? "" : String(cell).trim();
    if (!raw || isGarbageLabel(raw)) continue;
    const normalized = normalizeLabel(raw);
    if (!normalized || looksLikeRatio(normalized)) continue;

    const m = matchLabel(normalized);
    if (!m.field) continue;

    let total = 0;
    let seen = 0;
    const perRowValues: (number | null)[] = [];
    for (const { row } of dataRows) {
      const n = coerceNumber(row[colIdx]);
      perRowValues.push(n);
      if (n !== null) {
        total += n;
        seen++;
      }
    }
    if (seen > 0) {
      const existing = result.fields[m.field];
      if (!existing || m.confidence > existing.confidence) {
        result.fields[m.field] = { value: total, confidence: m.confidence };
      }
      result.filledRowCount += seen;
      if (process.env.NODE_ENV !== "test") {
        console.log(
          `[parser]   col="${raw}" → ${m.field}=${total} (${seen}/${dataRows.length} cells) values=[${perRowValues.join(",")}]`,
        );
      }
    }
  }

  // ── Strategy B ────────────────────────────────────────────────────────
  // Seulement si Strategy A n'a rien trouvé de significatif (évite
  // double-comptage sur une feuille bien en colonnes).
  const filledByA = Object.keys(result.fields).length;
  if (filledByA < 2 && headerRow.length >= 2) {
    for (const { row, sheetRowNumber } of dataRows) {
      const labelRaw = String(row[0] ?? "").trim();
      if (!labelRaw || isGarbageLabel(labelRaw)) continue;
      const normalized = normalizeLabel(labelRaw);
      if (!normalized || looksLikeRatio(normalized)) continue;
      if (isMetadataLabel(normalized)) continue;

      let value: number | null = null;
      for (let i = 1; i < row.length; i++) {
        value = coerceNumber(row[i]);
        if (value !== null) break;
      }
      if (value === null) continue;

      const m = matchLabel(normalized);
      if (!m.field) {
        if (/[a-z]/.test(normalized) && !/^\d/.test(normalized)) {
          result.unknowns.push({
            rawLabel: labelRaw,
            sheetName,
            rowNumber: sheetRowNumber,
          });
        }
        continue;
      }

      const existing = result.fields[m.field];
      if (!existing) {
        result.fields[m.field] = { value, confidence: m.confidence };
      } else if (m.confidence > existing.confidence) {
        result.fields[m.field] = { value, confidence: m.confidence };
      } else if (m.confidence === existing.confidence) {
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
// 2. Si ambigu, préférer celle avec le plus de cellules remplies
// 3. En dernier recours, garder le score de confiance le plus haut
//
// → On ne somme jamais entre feuilles (les 3 onglets contiennent la même
//   donnée à des granularités différentes : les sommer doublerait/triplerait
//   les chiffres).

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

// ── Garde-fou mandats ───────────────────────────────────────────────────────

function applyMandatsRule(
  fields: Record<ExtractionFieldId, FieldResult>,
): void {
  const ms = fields.mandatsSignes;
  const me = fields.mandatsExclusifs;
  if (ms.value !== null && me.value !== null && me.value > ms.value) {
    fields.mandatsSignes.confidence = Math.min(ms.confidence, 0.5);
    fields.mandatsExclusifs.confidence = Math.min(me.confidence, 0.5);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

export function parseExcelRobust(buffer: Buffer): ExcelExtractionResult {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    // cellFormula: false évite que les cellules formule non cachées arrivent en string "=SUM(...)"
    cellFormula: false,
    cellDates: true,
  });
  const sheetsRead: string[] = [];
  const sheetsSkipped: string[] = [];
  const perSheet: Array<{ name: string; result: SheetExtraction }> = [];
  const csvParts: string[] = [];

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];

    // CSV dump pour fallback Gemini (on dump TOUS les onglets, titre inclus)
    csvParts.push(`--- ${name} ---\n${XLSX.utils.sheet_to_csv(sheet)}`);

    // Skip par nom (Analyse, Objectifs, Notes, Readme…)
    if (shouldSkipSheetByName(name)) {
      sheetsSkipped.push(name);
      continue;
    }

    // Lecture AOA : on contrôle nous-mêmes la ligne d'en-tête
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: true,
      defval: null,
      raw: true,
    });

    const parsed = parseSheetAOA(name, aoa);

    // Si la feuille n'a donné aucun champ et aucun header détecté,
    // elle contient probablement du texte libre → skip
    if (Object.keys(parsed.fields).length === 0 && parsed.unknowns.length === 0) {
      sheetsSkipped.push(name);
      continue;
    }

    sheetsRead.push(name);
    perSheet.push({ name, result: parsed });
  }

  const fields = mergeSheetResults(perSheet);
  applyMandatsRule(fields);

  // Dédup des unknowns par rawLabel (un même intitulé sur plusieurs
  // feuilles = une seule ligne remontée)
  const seenLabels = new Set<string>();
  const unknownLabels: UnknownLabel[] = [];
  for (const s of perSheet) {
    for (const u of s.result.unknowns) {
      if (isGarbageLabel(u.rawLabel)) continue;
      const key = normalizeLabel(u.rawLabel);
      if (!key || seenLabels.has(key)) continue;
      seenLabels.add(key);
      unknownLabels.push(u);
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
