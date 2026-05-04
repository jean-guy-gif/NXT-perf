/**
 * Moteur de diagnostic conseiller (PR3.8 follow-up — coaching intelligent).
 *
 * Module PURE — pas de hook, pas de dépendance React. Lit les chiffres
 * réels d'une `PeriodResults` + objectifs de catégorie, applique des
 * règles déterministes simples, et identifie LE point de douleur
 * prioritaire + jusqu'à 2 secondaires.
 *
 * Aucune IA — règles ordonnées par criticité métier (haut de funnel
 * d'abord, bas de funnel ensuite).
 */

import { CATEGORY_OBJECTIVES } from "@/lib/constants";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import type { PeriodResults } from "@/types/results";
import type { UserCategory } from "@/types/user";

// ─── Types publics ────────────────────────────────────────────────────────

export type PainPointKey =
  | "rentree_mandats"
  | "attractivite_prix"
  | "argumentaire_visite"
  | "negociation"
  | "suivi_acte"
  | "suivi_vendeur"
  | "rythme_global";

export interface DiagnosticMetric {
  label: string;
  value: string;
  /** % d'évolution signé vs période précédente, optionnel. */
  trendPct?: number;
}

export interface PainPoint {
  key: PainPointKey;
  label: string;
  /** Levier coaching associé (les 8 ExpertiseRatioId). null = aucun mappé. */
  expertiseId: ExpertiseRatioId | null;
  /** Phrase courte expliquant le diagnostic en 1 ligne. */
  justification: string;
  /** Chiffres-clés qui justifient le diagnostic. */
  metrics: DiagnosticMetric[];
  /** Sévérité 0..1, sert au tri primary/secondary. */
  severity: number;
}

export interface AdvisorMetricsSnapshot {
  ca: number;
  mandatsSignes: number;
  visites: number;
  offres: number;
  compromis: number;
  actes: number;
  /** Taille du portefeuille actif (mandats array). */
  stock: number;
  // Évolutions (signed pct, peut être absent si pas de période précédente)
  caTrendPct?: number;
  mandatsTrendPct?: number;
  visitesTrendPct?: number;
  offresTrendPct?: number;
}

export interface AdvisorDiagnosis {
  metrics: AdvisorMetricsSnapshot;
  primary: PainPoint | null;
  secondary: PainPoint[];
  focusRecommendation: string;
  /** Snapshot des chiffres prêts pour l'UI (libellés FR + format). */
  displayMetrics: DiagnosticMetric[];
}

// ─── Implémentation ───────────────────────────────────────────────────────

const PAIN_LABEL: Record<PainPointKey, string> = {
  rentree_mandats: "Rentrée de mandats",
  attractivite_prix: "Attractivité / prix",
  argumentaire_visite: "Argumentaire visite",
  negociation: "Négociation / closing",
  suivi_acte: "Suivi compromis → acte",
  suivi_vendeur: "Suivi vendeur / repositionnement",
  rythme_global: "Rythme d'activité global",
};

const PAIN_TO_LEVER: Record<PainPointKey, ExpertiseRatioId | null> = {
  rentree_mandats: "estimations_mandats",
  attractivite_prix: "acheteurs_tournee",
  argumentaire_visite: "visites_offres",
  negociation: "offres_compromis",
  suivi_acte: "compromis_actes",
  suivi_vendeur: "estimations_mandats",
  rythme_global: "contacts_estimations",
};

/** Seuil "OK" : on considère qu'un palier est franchi si réalisé/cible ≥ 0.7. */
const OK_THRESHOLD = 0.7;

/** Seuil sous lequel on considère un palier en faiblesse marquée. */
const WEAK_THRESHOLD = 0.5;

interface DiagnosisInput {
  current: PeriodResults | null;
  previous?: PeriodResults | null;
  category: UserCategory;
}

export function diagnoseAdvisor(input: DiagnosisInput): AdvisorDiagnosis {
  const { current, previous, category } = input;
  const obj =
    CATEGORY_OBJECTIVES[category] ?? CATEGORY_OBJECTIVES.confirme;

  const metrics: AdvisorMetricsSnapshot = current
    ? {
        ca: current.ventes.chiffreAffaires ?? 0,
        mandatsSignes: current.vendeurs.mandatsSignes ?? 0,
        visites: current.acheteurs.nombreVisites ?? 0,
        offres: current.acheteurs.offresRecues ?? 0,
        compromis: current.acheteurs.compromisSignes ?? 0,
        actes: current.ventes.actesSignes ?? 0,
        stock: current.vendeurs.mandats?.length ?? 0,
      }
    : {
        ca: 0,
        mandatsSignes: 0,
        visites: 0,
        offres: 0,
        compromis: 0,
        actes: 0,
        stock: 0,
      };

  // Tendances vs période précédente (optionnel)
  if (previous) {
    metrics.caTrendPct = trendPct(metrics.ca, previous.ventes.chiffreAffaires);
    metrics.mandatsTrendPct = trendPct(
      metrics.mandatsSignes,
      previous.vendeurs.mandatsSignes,
    );
    metrics.visitesTrendPct = trendPct(
      metrics.visites,
      previous.acheteurs.nombreVisites,
    );
    metrics.offresTrendPct = trendPct(
      metrics.offres,
      previous.acheteurs.offresRecues,
    );
  }

  // Ratios réalisé/cible (par défaut "confirme")
  const r = {
    mandats: ratio(metrics.mandatsSignes, obj.mandats),
    visites: ratio(metrics.visites, obj.visites),
    offres: ratio(metrics.offres, obj.offres),
    compromis: ratio(metrics.compromis, obj.compromis),
    actes: ratio(metrics.actes, obj.actes),
  };

  const points: PainPoint[] = [];

  // ── Règle 1 : peu de mandats → rentrée de mandats
  if (r.mandats < OK_THRESHOLD) {
    points.push({
      key: "rentree_mandats",
      label: PAIN_LABEL.rentree_mandats,
      expertiseId: PAIN_TO_LEVER.rentree_mandats,
      justification: `Mandats signés à ${pct(r.mandats)} de l'objectif (${metrics.mandatsSignes} sur ${obj.mandats}).`,
      metrics: [
        { label: "Mandats signés", value: `${metrics.mandatsSignes} / ${obj.mandats}` },
        { label: "Visites", value: `${metrics.visites} / ${obj.visites}` },
      ],
      severity: severityOf(r.mandats),
    });
  }

  // ── Règle 2 : mandats OK mais visites faibles → attractivité / prix
  if (r.mandats >= OK_THRESHOLD && r.visites < OK_THRESHOLD) {
    points.push({
      key: "attractivite_prix",
      label: PAIN_LABEL.attractivite_prix,
      expertiseId: PAIN_TO_LEVER.attractivite_prix,
      justification: `Mandats OK (${metrics.mandatsSignes}) mais visites à ${pct(r.visites)} de l'objectif — biens probablement peu attractifs ou prix hauts.`,
      metrics: [
        { label: "Mandats signés", value: `${metrics.mandatsSignes} / ${obj.mandats}` },
        { label: "Visites", value: `${metrics.visites} / ${obj.visites}` },
      ],
      severity: severityOf(r.visites),
    });
  }

  // ── Règle 3 : visites OK mais offres faibles → argumentaire / découverte
  if (r.visites >= OK_THRESHOLD && r.offres < OK_THRESHOLD) {
    points.push({
      key: "argumentaire_visite",
      label: PAIN_LABEL.argumentaire_visite,
      expertiseId: PAIN_TO_LEVER.argumentaire_visite,
      justification: `Visites OK (${metrics.visites}) mais offres à ${pct(r.offres)} de l'objectif — défi sur l'argumentaire ou la qualification acheteur.`,
      metrics: [
        { label: "Visites", value: `${metrics.visites} / ${obj.visites}` },
        { label: "Offres reçues", value: `${metrics.offres} / ${obj.offres}` },
      ],
      severity: severityOf(r.offres),
    });
  }

  // ── Règle 4 : offres OK mais compromis faibles → négociation / closing
  if (r.offres >= OK_THRESHOLD && r.compromis < OK_THRESHOLD) {
    points.push({
      key: "negociation",
      label: PAIN_LABEL.negociation,
      expertiseId: PAIN_TO_LEVER.negociation,
      justification: `Offres reçues (${metrics.offres}) mais compromis à ${pct(r.compromis)} de l'objectif — défi sur la négociation ou le closing.`,
      metrics: [
        { label: "Offres", value: `${metrics.offres} / ${obj.offres}` },
        { label: "Compromis", value: `${metrics.compromis} / ${obj.compromis}` },
      ],
      severity: severityOf(r.compromis),
    });
  }

  // ── Règle 5 : compromis OK mais actes en retard → suivi
  if (r.compromis >= OK_THRESHOLD && r.actes < OK_THRESHOLD) {
    points.push({
      key: "suivi_acte",
      label: PAIN_LABEL.suivi_acte,
      expertiseId: PAIN_TO_LEVER.suivi_acte,
      justification: `Compromis signés (${metrics.compromis}) mais actes à ${pct(r.actes)} de l'objectif — défi sur le suivi des conditions suspensives.`,
      metrics: [
        { label: "Compromis", value: `${metrics.compromis} / ${obj.compromis}` },
        { label: "Actes", value: `${metrics.actes} / ${obj.actes}` },
      ],
      severity: severityOf(r.actes),
    });
  }

  // ── Règle 6 : stock élevé sans activité → suivi vendeur
  // Stock > 2× cible mensuelle d'actes ET visites < seuil faible
  if (
    metrics.stock > 2 * obj.actes &&
    r.visites < WEAK_THRESHOLD &&
    obj.actes > 0
  ) {
    const stockRatio = metrics.stock / Math.max(1, 2 * obj.actes);
    points.push({
      key: "suivi_vendeur",
      label: PAIN_LABEL.suivi_vendeur,
      expertiseId: PAIN_TO_LEVER.suivi_vendeur,
      justification: `${metrics.stock} mandats en stock mais activité visite faible — manque de suivi vendeur ou besoin de repositionnement.`,
      metrics: [
        { label: "Stock", value: `${metrics.stock} mandats` },
        { label: "Visites", value: `${metrics.visites} / ${obj.visites}` },
      ],
      severity: Math.min(1, stockRatio / 4),
    });
  }

  // ── Règle 7 : tout est faible → rythme global
  if (
    points.length === 0 &&
    r.mandats < WEAK_THRESHOLD &&
    r.visites < WEAK_THRESHOLD
  ) {
    points.push({
      key: "rythme_global",
      label: PAIN_LABEL.rythme_global,
      expertiseId: PAIN_TO_LEVER.rythme_global,
      justification: `Volume d'activité faible sur tout le funnel — démarrer par la prospection et la rentrée d'estimations.`,
      metrics: [
        { label: "Mandats signés", value: `${metrics.mandatsSignes} / ${obj.mandats}` },
        { label: "Visites", value: `${metrics.visites} / ${obj.visites}` },
      ],
      severity: 1 - Math.max(r.mandats, r.visites),
    });
  }

  points.sort((a, b) => b.severity - a.severity);

  const primary = points[0] ?? null;
  const secondary = points.slice(1, 3);

  const focusRecommendation = buildFocusRecommendation(primary);

  const displayMetrics: DiagnosticMetric[] = [
    {
      label: "Chiffre d'affaires",
      value: formatCurrency(metrics.ca),
      trendPct: metrics.caTrendPct,
    },
    {
      label: "Mandats signés",
      value: `${metrics.mandatsSignes} / ${obj.mandats}`,
      trendPct: metrics.mandatsTrendPct,
    },
    {
      label: "Visites",
      value: `${metrics.visites} / ${obj.visites}`,
      trendPct: metrics.visitesTrendPct,
    },
    {
      label: "Offres",
      value: `${metrics.offres} / ${obj.offres}`,
      trendPct: metrics.offresTrendPct,
    },
    {
      label: "Compromis",
      value: `${metrics.compromis} / ${obj.compromis}`,
    },
    {
      label: "Actes",
      value: `${metrics.actes} / ${obj.actes}`,
    },
    {
      label: "Stock mandats",
      value: `${metrics.stock}`,
    },
  ];

  return {
    metrics,
    primary,
    secondary,
    focusRecommendation,
    displayMetrics,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function ratio(actual: number, target: number): number {
  if (target <= 0) return 1;
  return Math.max(0, actual / target);
}

function severityOf(r: number): number {
  // Si réalisé = 0, severity = 1 ; si réalisé = cible, severity = 0.
  return Math.max(0, Math.min(1, 1 - r));
}

function pct(r: number): string {
  return `${Math.round(r * 100)} %`;
}

function trendPct(current: number, previous: number | undefined | null): number | undefined {
  if (previous == null || previous === 0) return undefined;
  return Math.round(((current - previous) / previous) * 100);
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function buildFocusRecommendation(primary: PainPoint | null): string {
  if (!primary) {
    return "Aucun point de douleur prioritaire détecté — l'activité est équilibrée. Garder le rythme actuel.";
  }
  switch (primary.key) {
    case "rentree_mandats":
      return "Concentrer le coaching sur la prospection et le passage estimation → mandat signé.";
    case "attractivite_prix":
      return "Travailler le repositionnement des biens et l'accroche des annonces avec le conseiller.";
    case "argumentaire_visite":
      return "Travailler la qualification acheteur, la découverte et l'argumentaire pendant les visites.";
    case "negociation":
      return "Travailler la séquence de négociation et la posture de closing avec le vendeur.";
    case "suivi_acte":
      return "Mettre en place un suivi systématique des conditions suspensives entre compromis et acte.";
    case "suivi_vendeur":
      return "Caler une routine de suivi vendeur et un protocole de repositionnement des mandats anciens.";
    case "rythme_global":
      return "Reprendre par la base : volume de prospection et rentrée d'estimations.";
  }
}
