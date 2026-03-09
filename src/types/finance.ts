// ── Financial Pilotage types ──
// Mini cockpit dirigeant — not a full accounting module.
// Designed for extension toward NXT Finance.

export type HealthStatus = "ok" | "warning" | "danger";

/** Raw financial data for the agency — all fields optional (missing = manual input needed) */
export interface FinancialData {
  caTransaction: number;
  caGestion: number;
  caSyndic: number;
  caAutres: number;
  chargesFixesMensuelles: number;
  masseSalarialeMensuelle: number;
  tresorerieDisponible: number;
  dettesCourtTerme: number;
  fondsMandants: number;
}

export type FinancialFieldId = keyof FinancialData;

export interface MissingField {
  id: FinancialFieldId;
  label: string;
  impact: string;
}

export interface CashNetResult {
  value: number | null;
  coverageMonths: number | null;
  status: HealthStatus | null;
  missing: FinancialFieldId[];
}

export interface PointMortResult {
  pointMort: number | null;
  productionMensuelle: number | null;
  delta: number | null;
  status: HealthStatus | null;
  tauxMarge: number;
  missing: FinancialFieldId[];
}

export interface SalaryRatioResult {
  ratio: number | null;
  status: HealthStatus | null;
  missing: FinancialFieldId[];
}

export interface RevenueBreakdownItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface HealthScoreDetail {
  label: string;
  points: number;
  status: HealthStatus;
}

export interface HealthScoreResult {
  score: number;
  label: string;
  status: HealthStatus;
  details: HealthScoreDetail[];
}
