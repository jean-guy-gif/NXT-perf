import type { PeriodResults } from "@/types/results";

// ─── Constantes métier paramétrables ────────────────────────────────────────
// Délais réels du métier immobilier — sources : pratique terrain agence type.

/** Délai mandat exclusif → compromis (jours). */
export const DELAI_EXCLUSIF_JOURS = 92;
/** Délai mandat simple → compromis (jours). */
export const DELAI_SIMPLE_JOURS = 102;
/** Délai compromis → acte (notaire + suspensives). */
export const DELAI_COMPROMIS_ACTE_MOIS = 3;
/** Taux de chute d'un compromis (négociation finale, financement, etc.). */
export const TAUX_CHUTE_COMPROMIS = 0.08;
/** Fenêtre de projection trajectoire. */
export const FENETRE_PROJECTION_MOIS = 3;

/** Fallback valeur moyenne d'acte si historique insuffisant (€). */
export const FALLBACK_VALEUR_MOYENNE_ACTE = 250_000;
/** Fallback taux transfo mandat → compromis si historique insuffisant. */
export const FALLBACK_TAUX_TRANSFO_MANDAT_COMPROMIS = 0.75;
/** Seuil minimum d'historique pour calcul fiable (mois). */
export const MIN_HISTORY_MONTHS_FOR_RELIABLE_CALC = 3;

export type TrajectoryStatus = "saine" | "vigilance" | "risque";

/** Format YYYY-MM depuis une Date (utility partagée store/page/composants). */
export function getMonthKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Pondération d'une cohorte mensuelle de mandats selon son ancienneté approximative
 * (Q2 PR2i — approximation par cohorte, en l'absence de signedAt sur MandatEntry).
 *
 * Approximation : âge (jours) ≈ monthsOffset × 30. Calé sur 92j (exclu) / 102j (simple).
 *
 * - 0 : trop tôt (~15j)
 * - 1 : dans fenêtre, pas mûr (~45j)
 * - 2 : mûr proche du délai exclusif (~75j)
 * - 3 : légèrement dépassé (~105j)
 * - 4 : traîne (~135j)
 * - 5+ : signal négatif
 */
export function poidsMandatParCohorte(monthsOffset: number): number {
  if (monthsOffset === 0) return 0;
  if (monthsOffset === 1) return 0.6;
  if (monthsOffset === 2) return 1.0;
  if (monthsOffset === 3) return 0.7;
  if (monthsOffset === 4) return 0.4;
  return 0.1;
}

/** Délai pondéré : pctExclusivite × 92j + (1 - pctExclusivite) × 102j */
export function calculateDelaiPondere(pctExclusivite: number): number {
  const pct = Math.max(0, Math.min(1, pctExclusivite));
  return DELAI_EXCLUSIF_JOURS * pct + DELAI_SIMPLE_JOURS * (1 - pct);
}

export function calculateValeurMoyenneActe(monthsHistory: PeriodResults[]): number {
  const totalCA = monthsHistory.reduce(
    (s, r) => s + (r.ventes?.chiffreAffaires ?? 0),
    0,
  );
  const totalActes = monthsHistory.reduce(
    (s, r) => s + (r.ventes?.actesSignes ?? 0),
    0,
  );
  if (
    totalActes === 0 ||
    monthsHistory.length < MIN_HISTORY_MONTHS_FOR_RELIABLE_CALC
  ) {
    return FALLBACK_VALEUR_MOYENNE_ACTE;
  }
  return totalCA / totalActes;
}

export function calculateTauxTransfoMandatCompromis(
  monthsHistory: PeriodResults[],
): number {
  const totalMandats = monthsHistory.reduce(
    (s, r) => s + (r.vendeurs?.mandatsSignes ?? 0),
    0,
  );
  const totalCompromis = monthsHistory.reduce(
    (s, r) => s + (r.acheteurs?.compromisSignes ?? 0),
    0,
  );
  if (
    totalMandats === 0 ||
    monthsHistory.length < MIN_HISTORY_MONTHS_FOR_RELIABLE_CALC
  ) {
    return FALLBACK_TAUX_TRANSFO_MANDAT_COMPROMIS;
  }
  return totalCompromis / totalMandats;
}

/** CA sécurisé = compromis × valeurMoyenneActe × (1 - taux chute). */
export function calculateCASecurise(input: {
  compromisEnCours: number;
  valeurMoyenneActe: number;
}): number {
  return (
    input.compromisEnCours *
    input.valeurMoyenneActe *
    (1 - TAUX_CHUTE_COMPROMIS)
  );
}

/** Somme pondérée des mandats par cohorte (offset → nombre). */
export function calculateMandatsActifsPonderes(
  mandatsByCohort: Record<number, number>,
): number {
  let total = 0;
  for (const [offsetStr, count] of Object.entries(mandatsByCohort)) {
    total += count * poidsMandatParCohorte(Number(offsetStr));
  }
  return total;
}

/** CA probable = mandats pondérés × tauxTransfo × valeurMoyenneActe × (1 - taux chute). */
export function calculateCAProbable(input: {
  mandatsByCohort: Record<number, number>;
  pctExclusivite: number;
  tauxTransfoMandatCompromis: number;
  valeurMoyenneActe: number;
}): number {
  const ponderes = calculateMandatsActifsPonderes(input.mandatsByCohort);
  return (
    ponderes *
    input.tauxTransfoMandatCompromis *
    input.valeurMoyenneActe *
    (1 - TAUX_CHUTE_COMPROMIS)
  );
}

export interface TrajectoryInput {
  /** Compromis signés agrégés sur mois courant + 2 précédents. */
  compromisEnCours: number;
  /** Mandats signés par cohorte mensuelle (offset → nombre). */
  mandatsByCohort: Record<number, number>;
  /** % exclusivité agence (0..1) sur mandats actifs récents. */
  pctExclusivite: number;
  /** Historique des results agrégés (jusqu'à 6 mois) pour moyennes. */
  monthsHistory: PeriodResults[];
  /** Charges fixes mensuelles agence (depuis financialData). */
  chargesFixesMensuelles: number;
}

export interface TrajectoryResult {
  caSecurise: number;
  caProbable: number;
  totalProjete: number;
  pointMort3Mois: number;
  ratioVsPointMort: number;
  delaiPondere: number;
  pctExclusivite: number;
  status: TrajectoryStatus;
  /** false si historique < 3 mois ou charges fixes non saisies → mode degraded. */
  canCalculate: boolean;
  monthsAvailable: number;
}

export function getTrajectoryStatus(ratio: number): TrajectoryStatus {
  if (ratio < 1) return "risque";
  if (ratio < 1.2) return "vigilance";
  return "saine";
}

export function calculateTrajectoire(input: TrajectoryInput): TrajectoryResult {
  const valeurMoyenneActe = calculateValeurMoyenneActe(input.monthsHistory);
  const tauxTransfo = calculateTauxTransfoMandatCompromis(input.monthsHistory);
  const delaiPondere = calculateDelaiPondere(input.pctExclusivite);

  const caSecurise = calculateCASecurise({
    compromisEnCours: input.compromisEnCours,
    valeurMoyenneActe,
  });
  const caProbable = calculateCAProbable({
    mandatsByCohort: input.mandatsByCohort,
    pctExclusivite: input.pctExclusivite,
    tauxTransfoMandatCompromis: tauxTransfo,
    valeurMoyenneActe,
  });
  const totalProjete = caSecurise + caProbable;
  const pointMort3Mois =
    input.chargesFixesMensuelles * FENETRE_PROJECTION_MOIS;
  const ratioVsPointMort =
    pointMort3Mois > 0 ? totalProjete / pointMort3Mois : 0;
  const status = getTrajectoryStatus(ratioVsPointMort);
  const canCalculate =
    input.monthsHistory.length >= MIN_HISTORY_MONTHS_FOR_RELIABLE_CALC &&
    input.chargesFixesMensuelles > 0;

  return {
    caSecurise,
    caProbable,
    totalProjete,
    pointMort3Mois,
    ratioVsPointMort,
    delaiPondere,
    pctExclusivite: input.pctExclusivite,
    status,
    canCalculate,
    monthsAvailable: input.monthsHistory.length,
  };
}
