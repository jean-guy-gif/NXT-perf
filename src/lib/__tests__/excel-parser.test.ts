import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseExcelRobust, countFilledFields } from "../excel-parser";

// ── Helpers ────────────────────────────────────────────────────────────────

// 16 lignes de données hebdo — chaque ligne = valeurs pour les 10 colonnes
// numériques (dans l'ordre du header de la fixture).
// Colonnes : contacts, rdv, estims, mandats, exclu, visites, offres,
//            compromis, actes, ca
const HEBDO_ROWS: number[][] = [
  [22, 3, 3, 2, 1, 7, 2, 1, 0, 0],
  [38, 3, 3, 2, 1, 7, 2, 1, 0, 8500],
  [45, 3, 3, 2, 1, 7, 2, 1, 0, 12000],
  [30, 3, 3, 2, 1, 7, 2, 1, 0, 0],
  [35, 3, 3, 2, 1, 7, 2, 1, 0, 14500],
  [28, 3, 3, 2, 1, 7, 2, 1, 0, 0],
  [18, 3, 3, 2, 1, 7, 2, 1, 0, 9800],
  [20, 3, 3, 2, 1, 7, 2, 1, 0, 0],
  [40, 3, 3, 2, 1, 7, 2, 1, 0, 11200],
  [48, 3, 3, 2, 2, 7, 2, 1, 0, 0],
  [42, 4, 3, 2, 2, 7, 2, 1, 0, 0],
  [35, 4, 3, 2, 2, 7, 2, 1, 1, 0],
  [32, 4, 3, 2, 2, 8, 2, 1, 1, 0],
  [25, 4, 3, 2, 2, 8, 2, 1, 1, 0],
  [38, 4, 4, 3, 2, 8, 1, 0, 1, 0],
  [29, 4, 4, 3, 2, 8, 1, 0, 1, 0],
];

// Totaux attendus (sommes par colonne)
const EXPECTED_TOTALS = {
  contactsTotaux: 525,
  rdvEstimation: 54,
  estimationsRealisees: 50,
  mandatsSignes: 34,
  mandatsExclusifs: 23,
  nombreVisites: 116,
  offresRecues: 30,
  compromisSignes: 14,
  actesSignes: 5,
  chiffreAffaires: 56000,
};

// Construit un workbook synthétique reproduisant la structure d'un fichier
// business réel : titre mergé ligne 1, sous-titre ligne 2, vide ligne 3,
// header ligne 4, 16 lignes data, ligne Total.
function makeFixtureBuffer(): Buffer {
  const wb = XLSX.utils.book_new();

  // ── Sheet "Hebdo 2026" ───────────────────────────────────────────────
  const hebdoAOA: unknown[][] = [
    ["NXT PERFORMANCE — Résultats hebdomadaires 2026"],
    ["Agence Century 21 — Objectif 120 000 €"],
    [],
    [
      "Sem.",
      "Période",
      "Contacts",
      "RDV Estim.",
      "Estim. réal.", // forme abrégée qu'on trouve dans les fichiers réels
      "Mandats",
      "Exclus",
      "Visites",
      "Offres",
      "Compromis",
      "Actes",
      "CA",
      "Commentaire", // colonne metadata à ignorer silencieusement
    ],
  ];
  HEBDO_ROWS.forEach((vals, i) => {
    hebdoAOA.push([
      `S${i + 1}`,
      `2026-W${String(i + 1).padStart(2, "0")}`,
      ...vals,
      i === 0 ? "Bonne semaine" : "",
    ]);
  });
  // Ligne Total (doit être ignorée par le parseur)
  hebdoAOA.push([
    "Total",
    "",
    525,
    54,
    50,
    34,
    23,
    116,
    30,
    14,
    5,
    56000,
    "",
  ]);
  const hebdoSheet = XLSX.utils.aoa_to_sheet(hebdoAOA);
  XLSX.utils.book_append_sheet(wb, hebdoSheet, "Hebdo 2026");

  // ── Sheet "Bilan Mensuel 2026" (moins granulaire, même année) ────────
  // Inclut une colonne "Taux mandat" qui NE doit PAS être extraite.
  const bilanMensuelAOA: unknown[][] = [
    ["BILAN MENSUEL 2026"],
    [],
    [
      "Mois",
      "Contacts",
      "Mandats",
      "Taux mandat",
      "Actes",
      "CA",
    ],
    ["Janvier", 100, 8, 0.08, 1, 12000],
    ["Février", 120, 9, 0.075, 1, 14500],
    ["Mars", 130, 10, 0.077, 2, 18000],
    ["Avril", 95, 7, 0.074, 1, 11500],
  ];
  const bilanMensuelSheet = XLSX.utils.aoa_to_sheet(bilanMensuelAOA);
  XLSX.utils.book_append_sheet(wb, bilanMensuelSheet, "Bilan Mensuel 2026");

  // ── Sheet "Bilan 2025 (N-1)" (année antérieure) ──────────────────────
  const bilan2025AOA: unknown[][] = [
    ["BILAN 2025"],
    [],
    ["Mois", "Contacts", "Mandats", "Exclus", "Visites", "Actes", "CA"],
    ["Janvier", 80, 5, 2, 20, 1, 8000],
    ["Février", 90, 6, 3, 22, 1, 9500],
    ["Mars", 100, 7, 3, 25, 2, 13000],
  ];
  const bilan2025Sheet = XLSX.utils.aoa_to_sheet(bilan2025AOA);
  XLSX.utils.book_append_sheet(wb, bilan2025Sheet, "Bilan 2025 (N-1)");

  // ── Sheet "Analyse & Objectifs" (doit être ignorée par nom) ──────────
  const analyseAOA: unknown[][] = [
    ["ANALYSE & OBJECTIFS"],
    [],
    ["Remarque : trimestre 1 en ligne avec l'objectif annuel"],
    ["Objectif CA : 120 000 €"],
  ];
  const analyseSheet = XLSX.utils.aoa_to_sheet(analyseAOA);
  XLSX.utils.book_append_sheet(wb, analyseSheet, "Analyse & Objectifs");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("parseExcelRobust — structure business réaliste", () => {
  const buffer = makeFixtureBuffer();
  const result = parseExcelRobust(buffer);

  it("détecte les 3 onglets data et ignore l'onglet analyse", () => {
    expect(result.sheetsRead).toContain("Hebdo 2026");
    expect(result.sheetsRead).toContain("Bilan Mensuel 2026");
    expect(result.sheetsRead).toContain("Bilan 2025 (N-1)");
    expect(result.sheetsSkipped).toContain("Analyse & Objectifs");
  });

  it("privilégie Hebdo 2026 (année récente + plus granulaire) pour les 10 champs communs", () => {
    for (const [field, expectedTotal] of Object.entries(EXPECTED_TOTALS)) {
      const actual = result.fields[field as keyof typeof EXPECTED_TOTALS].value;
      expect(
        actual,
        `${field} attendu=${expectedTotal}, obtenu=${actual}`,
      ).toBe(expectedTotal);
    }
  });

  it("laisse baissePrix et rdvSuivi à null (absents du fichier)", () => {
    expect(result.fields.baissePrix.value).toBeNull();
    expect(result.fields.rdvSuivi.value).toBeNull();
  });

  it("ignore la ligne Total (pas de double comptage)", () => {
    // Si la ligne Total était additionnée, contacts serait 525 * 2 = 1050
    expect(result.fields.contactsTotaux.value).toBe(525);
    expect(result.fields.contactsTotaux.value).not.toBe(1050);
  });

  it("ignore la colonne 'Taux mandat' (ratio/pourcentage)", () => {
    // Si "Taux mandat" avait matché mandatsSignes, la valeur serait altérée.
    // On vérifie que la valeur vient de Hebdo 2026 (34), pas de la somme
    // Bilan Mensuel (8+9+10+7=34 — coïncidence numérique évitée côté
    // mergeSheetResults par priorité Hebdo).
    expect(result.fields.mandatsSignes.value).toBe(34);
  });

  it("ne remonte aucun intitulé __EMPTY dans unknownLabels", () => {
    const badLabels = result.unknownLabels.filter((u) =>
      /^__EMPTY/.test(u.rawLabel),
    );
    expect(badLabels).toHaveLength(0);
  });

  it("ne remonte pas le titre 'NXT PERFORMANCE' comme unknown", () => {
    const titleLabels = result.unknownLabels.filter((u) =>
      u.rawLabel.toLowerCase().includes("nxt performance"),
    );
    expect(titleLabels).toHaveLength(0);
  });

  it("remplit au moins 10/12 champs (fallback Gemini inutile)", () => {
    expect(countFilledFields(result.fields)).toBeGreaterThanOrEqual(10);
  });

  it("confidence ≥ 0.8 pour les champs à matching exact du dictionnaire", () => {
    // "Contacts" → exact match synonyme "contacts" → 0.95
    expect(result.fields.contactsTotaux.confidence).toBeGreaterThanOrEqual(0.8);
    // "Mandats" → exact match → 0.95
    expect(result.fields.mandatsSignes.confidence).toBeGreaterThanOrEqual(0.8);
    // "Exclus" → exact match à synonyme de mandatsExclusifs → 0.95
    expect(result.fields.mandatsExclusifs.confidence).toBeGreaterThanOrEqual(
      0.8,
    );
  });

  it("reconnait 'Estim. réal.' (forme abrégée avec points et accent)", () => {
    // "Estim. réal." normalisé = "estim real" → synonyme direct
    expect(result.fields.estimationsRealisees.value).toBe(50);
    expect(result.fields.estimationsRealisees.confidence).toBeGreaterThanOrEqual(
      0.8,
    );
  });

  it("ne remonte aucune colonne metadata ('Sem.', 'Période', 'Mois', 'Commentaire', 'Total') dans unknowns", () => {
    const metadataPatterns = [/^sem/i, /^periode$/i, /^mois$/i, /^commentaire$/i, /^total$/i];
    const offending = result.unknownLabels.filter((u) =>
      metadataPatterns.some((p) => p.test(u.rawLabel.trim())),
    );
    expect(
      offending,
      `unknowns contains metadata: ${offending.map((o) => o.rawLabel).join(", ")}`,
    ).toHaveLength(0);
  });

  it("csvDump contient les intitulés des 3 onglets data + l'onglet analyse", () => {
    expect(result.csvDump).toContain("Hebdo 2026");
    expect(result.csvDump).toContain("Bilan Mensuel 2026");
    expect(result.csvDump).toContain("Analyse & Objectifs");
    expect(result.csvDump).toContain("NXT PERFORMANCE");
  });
});

// ── Cas dégradés ────────────────────────────────────────────────────────────

describe("parseExcelRobust — cas dégradés", () => {
  it("retourne un résultat vide si aucune ligne header détectable (< 3 matches)", () => {
    const wb = XLSX.utils.book_new();
    const aoa: unknown[][] = [
      ["Note libre du conseiller"],
      ["Blabla blabla"],
      ["Nombre : 42"],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, sheet, "Notes");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const res = parseExcelRobust(buf);
    expect(countFilledFields(res.fields)).toBe(0);
  });

  it("inclut la première ligne de données (S1) dans la somme — pas d'off-by-one", () => {
    // Fixture où S1 a une valeur distinctive (99). Si le parseur skippe
    // S1 par erreur (lecture à partir de header_row+2 au lieu de +1), le
    // total sera réduit de 99.
    const wb = XLSX.utils.book_new();
    const aoa: unknown[][] = [
      ["BILAN 2026"], // titre ligne 1 (mergé)
      [],             // vide ligne 2
      ["Sem.", "Contacts", "Mandats", "Visites"], // header ligne 3
      ["S1", 99, 7, 10], // distinctive S1
      ["S2", 1, 1, 1],
      ["S3", 1, 1, 1],
      ["S4", 1, 1, 1],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, sheet, "Hebdo");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const res = parseExcelRobust(buf);
    expect(res.fields.contactsTotaux.value).toBe(99 + 1 + 1 + 1);
    expect(res.fields.mandatsSignes.value).toBe(7 + 1 + 1 + 1);
    expect(res.fields.nombreVisites.value).toBe(10 + 1 + 1 + 1);
  });

  it("traite un CSV plat sans titre mergé (header ligne 1)", () => {
    const wb = XLSX.utils.book_new();
    const aoa: unknown[][] = [
      ["Contacts", "Mandats", "Visites", "Actes", "CA"],
      [100, 10, 50, 5, 50000],
      [120, 12, 60, 6, 60000],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, sheet, "Export 2026");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const res = parseExcelRobust(buf);
    expect(res.fields.contactsTotaux.value).toBe(220);
    expect(res.fields.mandatsSignes.value).toBe(22);
    expect(res.fields.nombreVisites.value).toBe(110);
    expect(res.fields.actesSignes.value).toBe(11);
    expect(res.fields.chiffreAffaires.value).toBe(110000);
  });
});
