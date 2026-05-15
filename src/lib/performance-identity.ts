/**
 * performance-identity — sous-PR Coach-25.
 *
 * Classifie un conseiller dans un archetype de performance a partir de
 * son historique de saisies. Logique deterministe, sans RAG, sans saisie
 * additionnelle : on reutilise uniquement la donnee deja collectee
 * (PeriodResults).
 *
 * 7 archetypes + 1 fallback "en construction" si data insuffisante.
 *
 * Chaque archetype recoit un score 0-100 selon des criteres lisibles.
 * Le primary = max(score). Le secondary = 2e max (si > 30 et != primary).
 * Le report inclut signature metrics, superpower, blind spot pour
 * l'affichage UI (PerformanceIdentityCard).
 */
import type { PeriodResults } from "@/types/results";

export type ArchetypeId =
  | "eclaireur"
  | "closer"
  | "sprinter"
  | "regulier"
  | "encaisseur"
  | "volumeur"
  | "conseiller_plein"
  | "in_construction";

export interface ArchetypeDefinition {
  id: ArchetypeId;
  /** Nom court Tedesco-style ("L'Eclaireur"). */
  name: string;
  /** Tagline courte qui caracterise le profil. */
  tagline: string;
  /** Description longue 2-3 phrases pour le portrait. */
  description: string;
  /** 1 phrase Tedesco : son superpouvoir terrain. */
  superpower: string;
  /** 1 phrase Tedesco : son angle mort recurrent. */
  blindSpot: string;
  /** Couleur theme (tailwind) pour le card hero. */
  accentColor: "indigo" | "emerald" | "amber" | "slate" | "rose" | "violet" | "sky";
}

export const ARCHETYPES: Record<ArchetypeId, ArchetypeDefinition> = {
  eclaireur: {
    id: "eclaireur",
    name: "L'Éclaireur",
    tagline: "Le prospecteur acharné",
    description:
      "Tu génères du pipeline en quantité. Ton terrain c'est la prospection, le porte-à-porte, le réseautage. Tu ouvres beaucoup de portes — mais tu en convertis moins en RDV qualifiés.",
    superpower:
      "Tu remplis la machine commerciale. Quand le réseau a besoin de volume haut funnel, c'est toi.",
    blindSpot:
      "Tu perds beaucoup de contacts en route. Question : est-ce un sujet de qualification ou de pitch ?",
    accentColor: "amber",
  },
  closer: {
    id: "closer",
    name: "Le Closer",
    tagline: "L'expert de la signature",
    description:
      "Tu transformes peu mais bien. Une fois qu'un dossier rentre dans ton pipeline, tu le mènes au bout : compromis, acte. Ton terrain c'est la conviction et la gestion d'objection.",
    superpower:
      "Sur le bas du funnel, peu d'agents te battent. Tu ne lâches pas un mandat avant l'acte.",
    blindSpot:
      "Sans alimentation haut funnel, tu plafonnes. Ta croissance dépend du volume amont.",
    accentColor: "emerald",
  },
  sprinter: {
    id: "sprinter",
    name: "Le Sprinter",
    tagline: "L'intense par à-coups",
    description:
      "Tu fonctionnes par cycles. Mois explosif, mois de récupération. Ta production est forte sur l'année mais imprévisible mois à mois.",
    superpower:
      "Tu sais accélérer quand il faut. Tes pics dépassent largement la moyenne du réseau.",
    blindSpot:
      "Tes creux te coûtent. Apprendre à transformer un mois pic en habitude = ton prochain palier.",
    accentColor: "rose",
  },
  regulier: {
    id: "regulier",
    name: "Le Régulier",
    tagline: "Le métronome fiable",
    description:
      "Tu produis du mandat, des visites, du CA chaque mois sans à-coup. Volatilité faible, pas de crise. C'est rassurant — pour toi et pour le manager.",
    superpower:
      "Tu es la colonne vertébrale de l'équipe. Prévisible, fiable, jamais en panique.",
    blindSpot:
      "Le plafond de verre te guette. Pour exploser, il faut accepter un peu de chaos.",
    accentColor: "sky",
  },
  encaisseur: {
    id: "encaisseur",
    name: "L'Encaisseur",
    tagline: "Le sélectif rentable",
    description:
      "Peu de mandats mais des honoraires moyens élevés. Tu ne traites que ce qui mérite ton temps. ROI temps excellent.",
    superpower:
      "Ta marge unitaire t'amène loin avec peu d'effort. Stratégie de niche maîtrisée.",
    blindSpot:
      "Sélectif = exposé. Un seul mandat qui dérape pèse lourd sur ton mois.",
    accentColor: "violet",
  },
  volumeur: {
    id: "volumeur",
    name: "Le Volumeur",
    tagline: "Le couvreur de marché",
    description:
      "Tu signes beaucoup, partout. Tu maillon ton secteur, génères de la notoriété. Honoraires moyens plus faibles mais tu compenses par le nombre.",
    superpower:
      "Tu es visible partout. Le réseau te connaît, les vendeurs t'appellent.",
    blindSpot:
      "Ton temps est dilué. Tu travailles dur pour des marges sous pression.",
    accentColor: "indigo",
  },
  conseiller_plein: {
    id: "conseiller_plein",
    name: "Le Conseiller Plein",
    tagline: "L'équilibre 360°",
    description:
      "Aucun marqueur dominant. Tu couvres correctement tous les axes du métier — prospection, conversion, signature, suivi. Polyvalent.",
    superpower:
      "Tu es l'agent que tu envoies en confiance partout. Pas de point faible majeur.",
    blindSpot:
      "Pas de signature non plus. Pour rayonner, choisis 1 axe où devenir excellent.",
    accentColor: "slate",
  },
  in_construction: {
    id: "in_construction",
    name: "Profil en construction",
    tagline: "Pas assez d'historique",
    description:
      "Il nous manque encore quelques semaines de saisie pour dessiner ton portrait. Continue tes saisies hebdo — ton archetype apparaîtra automatiquement.",
    superpower:
      "Ton profil unique se dessine. Patience, la donnée parle dès le 2e mois.",
    blindSpot:
      "Pour révéler ton profil il faut au moins 4 semaines de saisies complètes.",
    accentColor: "slate",
  },
};

// ─── Metrics agrégés ──────────────────────────────────────────────────────

interface AggregatedMetrics {
  /** Nb de mois distincts presents dans la fenetre. */
  monthsCovered: number;
  /** Volumes moyens par mois (somme / monthsCovered). */
  monthly: {
    contacts: number;
    rdvEstimation: number;
    estimations: number;
    mandats: number;
    visites: number;
    acheteurs: number;
    offres: number;
    compromis: number;
    actes: number;
    chiffreAffaires: number;
  };
  /** Honoraires moyens (CA / actes) sur la fenetre. */
  avgHonoraires: number;
  /** Pourcentage d'exclu sur la fenetre. */
  pctExclu: number;
  /** Ratios cles. */
  ratios: {
    contactsParEstim: number;
    estimParMandat: number;
    offresParCompromis: number;
    compromisParActe: number;
  };
  /**
   * Coefficient de variation des volumes (stddev/mean) calcule sur les
   * mandats mois par mois. Sert au Sprinter. 0 = stable, >0.5 = volatile.
   */
  cv: number;
}

function distinctMonthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function safeDivide(a: number, b: number): number {
  return b > 0 ? a / b : 0;
}

function computeCV(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / values.length;
  const stddev = Math.sqrt(variance);
  return stddev / mean;
}

function aggregate(results: PeriodResults[]): AggregatedMetrics {
  // Bucket par mois pour calculer CV sur les mandats
  const byMonth = new Map<string, PeriodResults[]>();
  for (const r of results) {
    const key = distinctMonthKey(r.periodStart);
    const arr = byMonth.get(key) ?? [];
    arr.push(r);
    byMonth.set(key, arr);
  }
  const monthsCovered = Math.max(1, byMonth.size);

  let contacts = 0;
  let rdvEstimation = 0;
  let estimations = 0;
  let mandats = 0;
  let mandatsExclu = 0;
  let visites = 0;
  let acheteurs = 0;
  let offres = 0;
  let compromis = 0;
  let actes = 0;
  let chiffreAffaires = 0;

  for (const r of results) {
    contacts += r.prospection.contactsTotaux ?? 0;
    rdvEstimation += r.prospection.rdvEstimation ?? 0;
    estimations += r.vendeurs.estimationsRealisees ?? 0;
    mandats += r.vendeurs.mandatsSignes ?? 0;
    mandatsExclu += (r.vendeurs.mandats ?? []).filter(
      (m) => m.type === "exclusif",
    ).length;
    visites += r.acheteurs.nombreVisites ?? 0;
    acheteurs += r.acheteurs.acheteursSortisVisite ?? 0;
    offres += r.acheteurs.offresRecues ?? 0;
    compromis += r.acheteurs.compromisSignes ?? 0;
    actes += r.ventes.actesSignes ?? 0;
    chiffreAffaires += r.ventes.chiffreAffaires ?? 0;
  }

  const mandatsPerMonth = Array.from(byMonth.values()).map((rs) =>
    rs.reduce((s, r) => s + (r.vendeurs.mandatsSignes ?? 0), 0),
  );

  return {
    monthsCovered,
    monthly: {
      contacts: contacts / monthsCovered,
      rdvEstimation: rdvEstimation / monthsCovered,
      estimations: estimations / monthsCovered,
      mandats: mandats / monthsCovered,
      visites: visites / monthsCovered,
      acheteurs: acheteurs / monthsCovered,
      offres: offres / monthsCovered,
      compromis: compromis / monthsCovered,
      actes: actes / monthsCovered,
      chiffreAffaires: chiffreAffaires / monthsCovered,
    },
    avgHonoraires: safeDivide(chiffreAffaires, actes),
    pctExclu: mandats > 0 ? mandatsExclu / mandats : 0,
    ratios: {
      contactsParEstim: safeDivide(contacts, estimations),
      estimParMandat: safeDivide(estimations, mandats),
      offresParCompromis: safeDivide(offres, compromis),
      compromisParActe: safeDivide(compromis, actes),
    },
    cv: computeCV(mandatsPerMonth),
  };
}

// ─── Scoring par archetype ────────────────────────────────────────────────

/**
 * Score smooth dans [0, 1] base sur la position d'une valeur dans une
 * fourchette. Utile pour traduire "valeur elevee" en score progressif.
 */
function rampUp(value: number, low: number, high: number): number {
  if (value <= low) return 0;
  if (value >= high) return 1;
  return (value - low) / (high - low);
}

function rampDown(value: number, low: number, high: number): number {
  if (value <= low) return 1;
  if (value >= high) return 0;
  return 1 - (value - low) / (high - low);
}

function scoreEclaireur(m: AggregatedMetrics): number {
  // Beaucoup de contacts/mois + ratio contacts/estim eleve (bcp de fuite haut funnel)
  const contactsHigh = rampUp(m.monthly.contacts, 25, 60);
  const ratioHigh = rampUp(m.ratios.contactsParEstim, 12, 25);
  return Math.round((contactsHigh * 0.6 + ratioHigh * 0.4) * 100);
}

function scoreCloser(m: AggregatedMetrics): number {
  // Offres/Compromis bas (conversion forte) + Compromis/Actes bas + contacts moyens ou bas
  const offresGood = rampDown(m.ratios.offresParCompromis, 1.5, 4);
  const actesGood = rampDown(m.ratios.compromisParActe, 1.2, 3);
  const contactsModerate = rampDown(m.monthly.contacts, 30, 80);
  return Math.round(
    (offresGood * 0.5 + actesGood * 0.3 + contactsModerate * 0.2) * 100,
  );
}

function scoreSprinter(m: AggregatedMetrics): number {
  // CV eleve sur les mandats mensuels + volume moyen non negligeable
  const cvHigh = rampUp(m.cv, 0.25, 0.7);
  const volumeOk = rampUp(m.monthly.mandats, 1, 4);
  if (m.monthsCovered < 2) return 0; // CV non significatif
  return Math.round((cvHigh * 0.75 + volumeOk * 0.25) * 100);
}

function scoreRegulier(m: AggregatedMetrics): number {
  // CV bas + volumes mid-tier + monthsCovered >= 2
  if (m.monthsCovered < 2) return 0;
  const cvLow = rampDown(m.cv, 0.15, 0.4);
  const volumeMid =
    rampUp(m.monthly.mandats, 1, 3) * rampDown(m.monthly.mandats, 4, 8);
  return Math.round((cvLow * 0.6 + volumeMid * 0.4) * 100);
}

function scoreEncaisseur(m: AggregatedMetrics): number {
  // Honoraires moyens eleves + peu de mandats
  const honoElevees = rampUp(m.avgHonoraires, 8000, 14000);
  const mandatsLow = rampDown(m.monthly.mandats, 2, 6);
  return Math.round((honoElevees * 0.65 + mandatsLow * 0.35) * 100);
}

function scoreVolumeur(m: AggregatedMetrics): number {
  // Beaucoup de mandats + honoraires moyens bas
  const mandatsHigh = rampUp(m.monthly.mandats, 3, 8);
  const honoLow = rampDown(m.avgHonoraires, 5000, 9000);
  return Math.round((mandatsHigh * 0.65 + honoLow * 0.35) * 100);
}

function scoreConseillerPlein(m: AggregatedMetrics): number {
  // Profil equilibre : aucun extremum, tous les axes corrects.
  // Tous les ratios cles dans une fourchette saine (rampUp/rampDown a 0.7+).
  const c1 = rampDown(m.ratios.contactsParEstim, 8, 20);
  const c2 = rampDown(m.ratios.estimParMandat, 1.5, 4);
  const c3 = rampDown(m.ratios.offresParCompromis, 1.5, 4);
  const c4 = rampDown(m.ratios.compromisParActe, 1.2, 3);
  const balanceScore = (c1 + c2 + c3 + c4) / 4;
  // Le score est haut SEULEMENT si chacun est >= 0.5 (pas de point faible).
  const allDecent = Math.min(c1, c2, c3, c4);
  return Math.round(Math.min(balanceScore, allDecent + 0.2) * 100);
}

// ─── Output ───────────────────────────────────────────────────────────────

export interface SignatureMetric {
  label: string;
  value: string;
  interpretation: string;
}

export interface IdentityProfile {
  primary: ArchetypeId;
  secondary: ArchetypeId | null;
  scores: Record<ArchetypeId, number>;
  signatureMetrics: SignatureMetric[];
  monthsCovered: number;
  insufficientData: boolean;
}

function formatRatio(v: number): string {
  return v.toFixed(1);
}

function formatPct(v: number): string {
  return `${Math.round(v * 100)} %`;
}

function formatEur(v: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(Math.round(v)) + " €";
}

function buildSignatureMetrics(m: AggregatedMetrics): SignatureMetric[] {
  return [
    {
      label: "Volume contacts / mois",
      value: Math.round(m.monthly.contacts).toString(),
      interpretation:
        m.monthly.contacts > 50
          ? "Volume élevé — prospection intense"
          : m.monthly.contacts > 25
            ? "Volume médian — couverture standard"
            : "Volume modeste — terrain limité",
    },
    {
      label: "Mandats / mois",
      value: m.monthly.mandats.toFixed(1),
      interpretation:
        m.monthly.mandats > 5
          ? "Forte génération de mandats"
          : m.monthly.mandats > 2
            ? "Génération régulière"
            : "Génération limitée",
    },
    {
      label: "% Exclusivité",
      value: formatPct(m.pctExclu),
      interpretation:
        m.pctExclu > 0.6
          ? "Tu négocies bien l'exclu"
          : m.pctExclu > 0.3
            ? "Mix exclu / simple équilibré"
            : "Surtout des simples — opportunité",
    },
    {
      label: "Honoraires moyens / acte",
      value: m.avgHonoraires > 0 ? formatEur(m.avgHonoraires) : "—",
      interpretation:
        m.avgHonoraires > 9000
          ? "Mandats de valeur"
          : m.avgHonoraires > 6000
            ? "Honoraires médians"
            : m.avgHonoraires > 0
              ? "Honoraires sous la médiane"
              : "Pas encore d'acte signé sur la période",
    },
    {
      label: "Conversion offres → compromis",
      value: m.ratios.offresParCompromis > 0
        ? formatRatio(m.ratios.offresParCompromis)
        : "—",
      interpretation:
        m.ratios.offresParCompromis === 0
          ? "Pas de compromis sur la période"
          : m.ratios.offresParCompromis < 2
            ? "Excellent — peu d'offres pour 1 compromis"
            : m.ratios.offresParCompromis < 4
              ? "Conversion correcte"
              : "Tu reçois des offres qui n'aboutissent pas",
    },
    {
      label: "Régularité (CV mandats)",
      value: m.monthsCovered < 2 ? "—" : m.cv.toFixed(2),
      interpretation:
        m.monthsCovered < 2
          ? "Indicateur nécessite au moins 2 mois"
          : m.cv < 0.2
            ? "Production très stable mois à mois"
            : m.cv < 0.5
              ? "Variations modérées"
              : "Production en dents de scie",
    },
  ];
}

/**
 * Point d'entree principal. Prend l'historique complet du conseiller et
 * retourne son profil typologique. Retourne primary = "in_construction"
 * si l'historique est insuffisant (< 4 semaines de saisie).
 */
export function computePerformanceIdentity(
  history: PeriodResults[],
): IdentityProfile {
  // Filtre safety : drop les saisies vides (toutes a 0)
  const valid = history.filter((r) => {
    return (
      (r.prospection.contactsTotaux ?? 0) > 0 ||
      (r.vendeurs.estimationsRealisees ?? 0) > 0 ||
      (r.vendeurs.mandatsSignes ?? 0) > 0 ||
      (r.acheteurs.nombreVisites ?? 0) > 0 ||
      (r.ventes.actesSignes ?? 0) > 0
    );
  });

  if (valid.length === 0) {
    return {
      primary: "in_construction",
      secondary: null,
      scores: emptyScores(),
      signatureMetrics: [],
      monthsCovered: 0,
      insufficientData: true,
    };
  }

  const m = aggregate(valid);

  const scores: Record<ArchetypeId, number> = {
    eclaireur: scoreEclaireur(m),
    closer: scoreCloser(m),
    sprinter: scoreSprinter(m),
    regulier: scoreRegulier(m),
    encaisseur: scoreEncaisseur(m),
    volumeur: scoreVolumeur(m),
    conseiller_plein: scoreConseillerPlein(m),
    in_construction: 0,
  };

  // Tri pour determiner primary + secondary (hors in_construction)
  const ranked = (Object.entries(scores) as [ArchetypeId, number][])
    .filter(([id]) => id !== "in_construction")
    .sort((a, b) => b[1] - a[1]);

  const [primaryId, primaryScore] = ranked[0];
  const [secondaryId, secondaryScore] = ranked[1] ?? [null, 0];

  // Si le primary score est trop bas (< 25), le profil n'est pas net
  // -> fallback "conseiller plein" plutot qu'archetype hasardeux.
  const primary: ArchetypeId =
    primaryScore < 25 ? "conseiller_plein" : primaryId;
  const secondary: ArchetypeId | null =
    secondaryId && secondaryScore >= 30 && secondaryId !== primary
      ? secondaryId
      : null;

  return {
    primary,
    secondary,
    scores,
    signatureMetrics: buildSignatureMetrics(m),
    monthsCovered: m.monthsCovered,
    insufficientData: m.monthsCovered < 2,
  };
}

function emptyScores(): Record<ArchetypeId, number> {
  return {
    eclaireur: 0,
    closer: 0,
    sprinter: 0,
    regulier: 0,
    encaisseur: 0,
    volumeur: 0,
    conseiller_plein: 0,
    in_construction: 0,
  };
}
