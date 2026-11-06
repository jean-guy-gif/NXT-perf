import type { PeriodResults } from "@/types/results";
import type { ComputedRatio, RatioConfig, RatioId } from "@/types/ratios";
import type { UserCategory } from "@/types/user";
import { CATEGORY_LABELS } from "@/lib/constants";
import { calculateObjectiveBreakdown } from "@/lib/objectifs";

/**
 * Génère le texte « Copier mon diagnostic » — pièce centrale de l'option A :
 * l'outil calcule, le stagiaire colle le résultat dans son Claude / ChatGPT.
 *
 * Fonction PURE et déterministe : aucun appel réseau, aucun appel IA.
 */

export interface DiagnosticExportInput {
  firstName: string;
  category: UserCategory;
  /** Date ISO de début de période, ex. "2026-02-01". */
  periodStart: string;
  results: PeriodResults;
  computedRatios: ComputedRatio[];
  ratioConfigs: Record<RatioId, RatioConfig>;
  /** Objectif GPS, si défini. Ligne « OBJECTIF ANNUEL » omise sinon. */
  objective?: { annualCA: number; avgActValue: number } | null;
}

/** Ordre et libellés figés des 8 ratios (7 cœur + honoraires moyens). */
const RATIO_ORDER: RatioId[] = [
  "contacts_rdv",
  "rdv_mandats",
  "pct_mandats_exclusifs",
  "acheteurs_visites",
  "visites_offre",
  "offres_compromis",
  "compromis_actes",
  "honoraires_moyens",
];

const RATIO_LABELS: Record<RatioId, string> = {
  contacts_rdv: "Contacts → RDV",
  rdv_mandats: "RDV → mandats",
  pct_mandats_exclusifs: "% mandats exclusifs",
  acheteurs_visites: "Acheteurs → visites",
  visites_offre: "Visites → offre",
  offres_compromis: "Offres → compromis",
  compromis_actes: "Compromis → actes",
  honoraires_moyens: "Honoraires moyens",
};

const STATUS_LABELS: Record<ComputedRatio["status"], string> = {
  ok: "OK",
  warning: "à surveiller",
  danger: "à renforcer",
};

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** "2026-02-01" → "février 2026". */
function formatPeriod(periodStart: string): string {
  const [year, month] = periodStart.split("-");
  const idx = Number(month) - 1;
  const monthLabel = MOIS[idx] ?? month;
  return `${monthLabel} ${year}`;
}

/** Entier avec séparateur de milliers (espace), ex. 10000 → "10 000". */
function formatEuro(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? "-" : "";
  const grouped = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return sign + grouped;
}

/** Nombre à 2 décimales max, virgule française, sans zéros superflus. */
function num(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toString().replace(".", ",");
}

/** Valeur ou cible formatée selon l'unité du ratio. */
function formatRatioNumber(ratioId: RatioId, value: number): string {
  if (ratioId === "honoraires_moyens") return `${formatEuro(value)} €`;
  if (ratioId === "pct_mandats_exclusifs") return `${Math.round(value)} %`;
  return num(value);
}

export function buildDiagnosticText(input: DiagnosticExportInput): string {
  const { firstName, category, periodStart, results, computedRatios, ratioConfigs, objective } = input;

  const byId = new Map<string, ComputedRatio>(
    computedRatios.map((r) => [r.ratioId, r]),
  );

  // ── En-tête ──────────────────────────────────────────────────────────────
  const niveau = CATEGORY_LABELS[category] ?? category;
  const lines: string[] = [
    "DIAGNOSTIC NXT PERFORMANCE",
    `Conseiller : ${firstName} — niveau ${niveau} — période : ${formatPeriod(periodStart)}`,
    "",
  ];

  // ── Activité du mois ───────────────────────────────────────────────────────
  const contacts = results.prospection.contactsTotaux;
  const rdv = results.vendeurs.rdvEstimation;
  const mandats = results.vendeurs.mandatsSignes;
  const exclusifs = results.vendeurs.mandats.filter((m) => m.type === "exclusif").length;
  const visites = results.acheteurs.nombreVisites;
  const offres = results.acheteurs.offresRecues;
  const compromis = results.acheteurs.compromisSignes;
  const actes = results.ventes.actesSignes;
  const honorairesMoyens = actes > 0 ? results.ventes.chiffreAffaires / actes : 0;

  lines.push("ACTIVITÉ DU MOIS");
  lines.push(
    `${contacts} contacts · ${rdv} RDV vendeurs · ${mandats} mandats dont ${exclusifs} exclusifs · ` +
      `${visites} visites · ${offres} offres · ${compromis} compromis · ${actes} actes · ` +
      `honoraires moyens ${formatEuro(honorairesMoyens)} €`,
  );
  lines.push("");

  // ── Les 8 ratios ─────────────────────────────────────────────────────────
  lines.push("MES 7 RATIOS (valeur / cible de mon niveau / statut)");
  for (const ratioId of RATIO_ORDER) {
    const r = byId.get(ratioId);
    const label = RATIO_LABELS[ratioId];
    if (!r) {
      lines.push(`- ${label} : — / — / —`);
      continue;
    }
    const value = formatRatioNumber(ratioId, r.value);
    const cible = formatRatioNumber(ratioId, r.thresholdForCategory);
    lines.push(`- ${label} : ${value} / ${cible} / ${STATUS_LABELS[r.status]}`);
  }
  lines.push("");

  // ── Points forts / priorités ───────────────────────────────────────────────
  const orderedRatios = RATIO_ORDER
    .map((id) => byId.get(id))
    .filter((r): r is ComputedRatio => r !== undefined);

  const forts = orderedRatios
    .filter((r) => r.status === "ok")
    .map((r) => RATIO_LABELS[r.ratioId as RatioId]);
  lines.push(
    `POINTS FORTS : ${forts.length > 0 ? forts.join(", ") : "aucun pour l'instant"}`,
  );

  // Les 2 plus faibles, du plus faible au moins faible (percentageOfTarget croissant).
  const faibles = [...orderedRatios]
    .sort((a, b) => a.percentageOfTarget - b.percentageOfTarget)
    .slice(0, 2)
    .map((r) => RATIO_LABELS[r.ratioId as RatioId]);
  lines.push(`RATIOS À TRAVAILLER EN PRIORITÉ : ${faibles.join(", ")}`);

  // ── Objectif GPS (optionnel) ────────────────────────────────────────────────
  if (objective && objective.annualCA > 0 && objective.avgActValue > 0) {
    const breakdown = calculateObjectiveBreakdown(
      objective.annualCA,
      objective.avgActValue,
      category,
      ratioConfigs,
    );
    lines.push(
      `OBJECTIF ANNUEL : CA ${formatEuro(objective.annualCA)} € → il me faut environ ` +
        `${breakdown.mandatsNecessaires} mandats, ${breakdown.visitesNecessaires} visites, ` +
        `${breakdown.compromisNecessaires} compromis.`,
    );
  }

  // ── Consigne IA ──────────────────────────────────────────────────────────
  lines.push("");
  lines.push("---");
  lines.push("CONSIGNE POUR L'IA (à adapter, voir le livret tactique) :");
  lines.push(
    "Tu es coach d'agents immobiliers. À partir de ce diagnostic, explique-moi en 5 lignes ce que mes deux ratios faibles révèlent sur ma façon de travailler, puis propose un plan sur 30 jours avec 3 actions concrètes par semaine, mesurables, centrées sur ces deux ratios. Tutoie-moi, sois direct.",
  );

  return lines.join("\n");
}
