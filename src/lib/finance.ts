import type {
  FinancialData,
  FinancialFieldId,
  MissingField,
  CashNetResult,
  PointMortResult,
  SalaryRatioResult,
  RevenueBreakdownItem,
  HealthScoreResult,
  HealthScoreDetail,
  HealthStatus,
} from "@/types/finance";

// ── Labels & impacts for each field ──

export const FINANCIAL_FIELD_LABELS: Record<FinancialFieldId, string> = {
  caTransaction: "CA Transaction",
  caGestion: "CA Gestion locative",
  caSyndic: "CA Syndic",
  caAutres: "CA Autres",
  chargesFixesMensuelles: "Charges fixes mensuelles",
  masseSalarialeMensuelle: "Masse salariale mensuelle",
  tresorerieDisponible: "Trésorerie disponible",
  dettesCourtTerme: "Dettes court terme",
  fondsMandants: "Fonds mandants",
};

const FIELD_IMPACTS: Record<FinancialFieldId, string> = {
  caTransaction: "Répartition du CA et score de dépendance",
  caGestion: "Répartition du CA et part de récurrence",
  caSyndic: "Répartition du CA et part de récurrence",
  caAutres: "Répartition du CA",
  chargesFixesMensuelles: "Point mort mensuel et couverture",
  masseSalarialeMensuelle: "Ratio masse salariale",
  tresorerieDisponible: "Cash net réel",
  dettesCourtTerme: "Cash net réel",
  fondsMandants: "Cash net réel — ces fonds ne sont pas de la trésorerie libre",
};

// Taux de marge par défaut : 50 %
// Hypothèse : agence immobilière = activité de service, marge brute élevée.
// Ce paramètre est facilement configurable pour NXT Finance.
const DEFAULT_TAUX_MARGE = 0.50;

// ── Helpers ──

function has(data: Partial<FinancialData>, field: FinancialFieldId): boolean {
  return data[field] !== undefined && data[field] !== null;
}

function val(data: Partial<FinancialData>, field: FinancialFieldId): number {
  return data[field] ?? 0;
}

// ── CA total ──

export function getTotalCA(data: Partial<FinancialData>): number | null {
  const caFields: FinancialFieldId[] = ["caTransaction", "caGestion", "caSyndic", "caAutres"];
  if (!caFields.some(f => has(data, f))) return null;
  return caFields.reduce((sum, f) => sum + val(data, f), 0);
}

// ── KPI 1 : Cash net réel ──
// cashNetReel = tresorerieDisponible - dettesCourtTerme - fondsMandants
// Couverture = cashNetReel / chargesFixesMensuelles (en mois)

export function calculateCashNetReel(data: Partial<FinancialData>): CashNetResult {
  const required: FinancialFieldId[] = ["tresorerieDisponible", "dettesCourtTerme", "fondsMandants"];
  const missing = required.filter(f => !has(data, f));

  if (missing.length > 0) {
    return { value: null, coverageMonths: null, status: null, missing };
  }

  const cashNet = val(data, "tresorerieDisponible") - val(data, "dettesCourtTerme") - val(data, "fondsMandants");

  let coverageMonths: number | null = null;
  if (has(data, "chargesFixesMensuelles") && val(data, "chargesFixesMensuelles") > 0) {
    coverageMonths = cashNet / val(data, "chargesFixesMensuelles");
  }

  let status: HealthStatus = "ok";
  if (coverageMonths !== null) {
    if (coverageMonths < 1) status = "danger";
    else if (coverageMonths < 3) status = "warning";
  } else if (cashNet < 0) {
    status = "danger";
  }

  return { value: cashNet, coverageMonths, status, missing: [] };
}

// ── KPI 2 : Point mort mensuel ──
// pointMort = chargesFixesMensuelles / tauxMarge
// delta = production mensuelle (CA total) - pointMort

export function calculatePointMort(
  data: Partial<FinancialData>,
  tauxMarge: number = DEFAULT_TAUX_MARGE
): PointMortResult {
  if (!has(data, "chargesFixesMensuelles")) {
    return { pointMort: null, productionMensuelle: null, delta: null, status: null, tauxMarge, missing: ["chargesFixesMensuelles"] };
  }

  const pointMort = val(data, "chargesFixesMensuelles") / tauxMarge;
  const totalCA = getTotalCA(data);

  let productionMensuelle: number | null = null;
  let delta: number | null = null;
  let status: HealthStatus | null = null;

  if (totalCA !== null && totalCA > 0) {
    productionMensuelle = totalCA;
    delta = productionMensuelle - pointMort;
    if (delta > 0) status = "ok";
    else if (delta > -pointMort * 0.1) status = "warning";
    else status = "danger";
  }

  return { pointMort, productionMensuelle, delta, status, tauxMarge, missing: [] };
}

// ── KPI 3 : Ratio masse salariale ──
// ratio = masseSalarialeMensuelle / caMensuelTotal * 100
// Seuils : < 35 % sain, 35-45 % surveillance, > 45 % danger

export function calculateSalaryRatio(data: Partial<FinancialData>): SalaryRatioResult {
  const missing: FinancialFieldId[] = [];
  if (!has(data, "masseSalarialeMensuelle")) missing.push("masseSalarialeMensuelle");

  const totalCA = getTotalCA(data);
  if (totalCA === null) {
    if (!has(data, "caTransaction")) missing.push("caTransaction");
  }

  if (missing.length > 0) {
    return { ratio: null, status: null, missing };
  }

  if (totalCA === 0) {
    return { ratio: null, status: null, missing: [] };
  }

  const ratio = (val(data, "masseSalarialeMensuelle") / totalCA!) * 100;

  let status: HealthStatus = "ok";
  if (ratio > 45) status = "danger";
  else if (ratio > 35) status = "warning";

  return { ratio, status, missing: [] };
}

// ── KPI 4 : Répartition du CA ──

export function calculateRevenueBreakdown(data: Partial<FinancialData>): RevenueBreakdownItem[] {
  const items: { key: FinancialFieldId; name: string; color: string }[] = [
    { key: "caTransaction", name: "Transaction", color: "#3375FF" },
    { key: "caGestion", name: "Gestion", color: "#39C97E" },
    { key: "caSyndic", name: "Syndic", color: "#A055FF" },
    { key: "caAutres", name: "Autres", color: "#FFA448" },
  ];

  const total = items.reduce((sum, item) => sum + val(data, item.key), 0);
  if (total === 0) return [];

  return items
    .filter(item => val(data, item.key) > 0)
    .map(item => ({
      name: item.name,
      value: val(data, item.key),
      color: item.color,
      percentage: (val(data, item.key) / total) * 100,
    }));
}

// ── KPI 5 : Score santé financière ──
// Base 100, pénalités cumulatives. Système lisible et documenté.
//
// Pénalités :
// -30 : cash net négatif
// -20 : couverture < 1 mois (si cash non négatif)
// -10 : couverture < 3 mois
// -25 : masse salariale > 45 %
// -10 : masse salariale > 35 %
// -15 : transaction > 70 % du CA
// -15 : aucun revenu récurrent (gestion + syndic = 0)
// -10 : récurrence < 15 %
// -15 : production sous le point mort

export function calculateHealthScore(data: Partial<FinancialData>): HealthScoreResult {
  let score = 100;
  const details: HealthScoreDetail[] = [];

  // Cash net réel
  const cash = calculateCashNetReel(data);
  if (cash.value !== null) {
    if (cash.value < 0) {
      score -= 30;
      details.push({ label: "Cash net négatif", points: -30, status: "danger" });
    } else if (cash.coverageMonths !== null && cash.coverageMonths < 1) {
      score -= 20;
      details.push({ label: "Couverture < 1 mois", points: -20, status: "danger" });
    } else if (cash.coverageMonths !== null && cash.coverageMonths < 3) {
      score -= 10;
      details.push({ label: "Couverture < 3 mois", points: -10, status: "warning" });
    }
  }

  // Masse salariale
  const salary = calculateSalaryRatio(data);
  if (salary.ratio !== null) {
    if (salary.ratio > 45) {
      score -= 25;
      details.push({ label: "Masse salariale > 45 % du CA", points: -25, status: "danger" });
    } else if (salary.ratio > 35) {
      score -= 10;
      details.push({ label: "Masse salariale > 35 % du CA", points: -10, status: "warning" });
    }
  }

  // Dépendance transaction
  const totalCA = getTotalCA(data);
  if (totalCA !== null && totalCA > 0 && has(data, "caTransaction")) {
    const transactionPct = (val(data, "caTransaction") / totalCA) * 100;
    if (transactionPct > 70) {
      score -= 15;
      details.push({ label: `Transaction = ${Math.round(transactionPct)} % du CA`, points: -15, status: "warning" });
    }
  }

  // Récurrence (gestion + syndic)
  if (totalCA !== null && totalCA > 0) {
    const recurrence = val(data, "caGestion") + val(data, "caSyndic");
    if (recurrence === 0) {
      score -= 15;
      details.push({ label: "Aucun revenu récurrent", points: -15, status: "warning" });
    } else {
      const recurrencePct = (recurrence / totalCA) * 100;
      if (recurrencePct < 15) {
        score -= 10;
        details.push({ label: `Récurrence faible (${Math.round(recurrencePct)} %)`, points: -10, status: "warning" });
      }
    }
  }

  // Point mort
  const pm = calculatePointMort(data);
  if (pm.delta !== null && pm.delta < 0) {
    score -= 15;
    details.push({ label: "Production sous le point mort", points: -15, status: "danger" });
  }

  score = Math.max(0, score);

  let label: string;
  let status: HealthStatus;
  if (score > 70) {
    label = "Situation stable";
    status = "ok";
  } else if (score >= 40) {
    label = "Vigilance requise";
    status = "warning";
  } else {
    label = "Risque élevé";
    status = "danger";
  }

  return { score, label, status, details };
}

// ── KPI 6 : Recommandation dirigeant ──
// Phrase unique, déterministe, basée sur les KPI.

export function buildExecutiveRecommendation(data: Partial<FinancialData>): string | null {
  const cash = calculateCashNetReel(data);
  const salary = calculateSalaryRatio(data);
  const totalCA = getTotalCA(data);
  const issues: string[] = [];

  if (cash.value !== null && cash.value < 0) {
    issues.push("trésorerie nette négative");
  } else if (cash.coverageMonths !== null && cash.coverageMonths < 1) {
    issues.push("cash sous tension critique");
  }

  if (salary.ratio !== null && salary.ratio > 45) {
    issues.push("masse salariale trop lourde");
  }

  if (totalCA !== null && totalCA > 0 && has(data, "caTransaction")) {
    const transactionPct = (val(data, "caTransaction") / totalCA) * 100;
    const recurrence = val(data, "caGestion") + val(data, "caSyndic");
    const recurrencePct = (recurrence / totalCA) * 100;

    if (transactionPct > 70 && recurrencePct < 15) {
      issues.push("trop dépendante de la transaction sans récurrence suffisante");
    } else if (transactionPct > 70) {
      issues.push("forte dépendance à la transaction");
    }
  }

  if (issues.length === 0) {
    const score = calculateHealthScore(data);
    if (score.score > 70) {
      return "Structure équilibrée. Continuez à diversifier les revenus récurrents pour sécuriser le modèle.";
    }
    return null;
  }

  if (issues.length === 1) {
    return `Point d'attention : ${issues[0]}. Action prioritaire recommandée.`;
  }

  const last = issues.pop()!;
  return `Points d'attention : ${issues.join(", ")} et ${last}. Plan d'action prioritaire recommandé.`;
}

// ── Détection des champs manquants ──

export function detectMissingFields(data: Partial<FinancialData>): MissingField[] {
  const allFields: FinancialFieldId[] = [
    "caTransaction", "caGestion", "caSyndic", "caAutres",
    "chargesFixesMensuelles", "masseSalarialeMensuelle",
    "tresorerieDisponible", "dettesCourtTerme", "fondsMandants",
  ];

  return allFields
    .filter(f => !has(data, f))
    .map(id => ({
      id,
      label: FINANCIAL_FIELD_LABELS[id],
      impact: FIELD_IMPACTS[id],
    }));
}

// ── Merge auto-rempli + saisie manuelle ──

export function mergeFinancialData(
  autoFilled: Partial<FinancialData>,
  manual: Partial<FinancialData>
): Partial<FinancialData> {
  return { ...autoFilled, ...manual };
}
