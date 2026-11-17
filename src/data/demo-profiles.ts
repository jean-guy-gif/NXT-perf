import type { PeriodResults, MandatEntry } from "@/types/results";
import type { UserCategory } from "@/types/user";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import { mockJanuaryResults, mockResults } from "@/data/mock-results";

/**
 * Profils démo au choix — pour que le point de douleur varie en salle.
 *
 * Le user démo connecté est un directeur multi-rôles (`m-demo`) ; sa vue
 * CONSEILLER lit ses propres saisies. On swappe donc les saisies de `m-demo`
 * (et son objectif personnel + son niveau) selon le profil choisi. Les données
 * manager (conseillers `u-demo-*`, filtrés sur `role === "conseiller"`) et les
 * autres rôles ne sont jamais touchés.
 */

/** User démo dont la vue conseiller affiche les données du profil choisi. */
export const DEMO_PROFILE_USER_ID = "m-demo";

export interface DemoProfile {
  id: string;
  /** Libellé affiché dans le sélecteur « Profil démo ». */
  label: string;
  /** Niveau appliqué au user démo pour ce profil. */
  category: UserCategory;
  /** Objectif personnel (carte « Mes objectifs »). */
  objective: { annualCA: number; avgActValue: number };
  /** Point de douleur attendu (documentation + tests). */
  expectedPainPoint: ExpertiseRatioId | null;
  /** Saisies mensuelles du profil (toutes sous `DEMO_PROFILE_USER_ID`). */
  results: PeriodResults[];
}

// ─── Génération des saisies mensuelles ──────────────────────────────────────

const MONTHS_2026: { key: string; start: string; end: string }[] = [
  { key: "01", start: "2026-01-01", end: "2026-01-31" },
  { key: "02", start: "2026-02-01", end: "2026-02-28" },
  { key: "03", start: "2026-03-01", end: "2026-03-31" },
  { key: "04", start: "2026-04-01", end: "2026-04-30" },
  { key: "05", start: "2026-05-01", end: "2026-05-31" },
  { key: "06", start: "2026-06-01", end: "2026-06-30" },
  { key: "07", start: "2026-07-01", end: "2026-07-31" },
  { key: "08", start: "2026-08-01", end: "2026-08-31" },
  { key: "09", start: "2026-09-01", end: "2026-09-30" },
  { key: "10", start: "2026-10-01", end: "2026-10-31" },
  { key: "11", start: "2026-11-01", end: "2026-11-30" },
];

interface MonthVol {
  contacts: number;
  estimations: number;
  mandats: number;
  exclusifs: number;
  sortis: number;
  visites: number;
  offres: number;
  compromis: number;
  actes: number;
  ca: number;
}

function mandatEntries(count: number, exclusifs: number): MandatEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `m-${i}`,
    type: i < exclusifs ? ("exclusif" as const) : ("simple" as const),
  }));
}

function monthRecord(
  profileId: string,
  m: { key: string; start: string; end: string },
  v: MonthVol
): PeriodResults {
  return {
    id: `demo-${profileId}-${m.key}`,
    userId: DEMO_PROFILE_USER_ID,
    periodType: "month",
    periodStart: m.start,
    periodEnd: m.end,
    prospection: { contactsTotaux: v.contacts, rdvEstimation: v.estimations },
    vendeurs: {
      rdvEstimation: v.estimations,
      estimationsRealisees: v.estimations,
      mandatsSignes: v.mandats,
      mandats: mandatEntries(v.mandats, v.exclusifs),
      rdvSuivi: 0,
      requalificationSimpleExclusif: 0,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: v.sortis,
      nombreVisites: v.visites,
      offresRecues: v.offres,
      compromisSignes: v.compromis,
      chiffreAffairesCompromis: 0,
    },
    ventes: { actesSignes: v.actes, chiffreAffaires: v.ca },
    createdAt: `${m.start}T00:00:00.000Z`,
    updatedAt: `${m.end}T00:00:00.000Z`,
  };
}

/**
 * Construit 11 saisies mensuelles (jan→nov 2026) pour un profil démo.
 *
 * - Sept/oct/nov (3 derniers mois) : leur SOMME vaut exactement `target`
 *   → l'agrégat 3 mois du diagnostic reproduit le point de douleur voulu.
 * - Juin/juil/août : « mois pont » SANS compromis ni acte (0), pour que la
 *   fenêtre 6 mois (compromis/actes) reste égale à celle des 3 mois.
 * - Jan→mai : production de base (avec compromis/actes/CA) pour nourrir le
 *   réalisé depuis janvier de la carte « Mes objectifs ».
 *
 * @param target ordre : [contacts, estimations, mandats, exclusifs, acheteurs,
 *   acheteurs sortis, visites, offres, compromis, actes]. « acheteurs » (pos 5)
 *   n'est pas stocké : le modèle KPI n'a pas de total acheteurs distinct des
 *   acheteurs sortis en visite.
 */
function buildProfileMonths(
  profileId: string,
  target: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ],
  avgAct: number
): PeriodResults[] {
  const [contacts, estimations, mandats, exclusifs, , sortis, visites, offres, compromis, actes] =
    target;
  const field = {
    contacts,
    estimations,
    mandats,
    exclusifs,
    sortis,
    visites,
    offres,
    compromis,
    actes,
  };
  const keys = Object.keys(field) as (keyof typeof field)[];
  const base = {} as Record<keyof typeof field, number>;
  const remainder = {} as Record<keyof typeof field, number>;
  keys.forEach((k) => {
    base[k] = Math.floor(field[k] / 3);
    remainder[k] = field[k] - 2 * base[k]; // mois de novembre (reste)
  });

  const volFrom = (
    src: Record<keyof typeof field, number>,
    withSales: boolean
  ): MonthVol => ({
    contacts: src.contacts,
    estimations: src.estimations,
    mandats: src.mandats,
    exclusifs: src.exclusifs,
    sortis: src.sortis,
    visites: src.visites,
    offres: src.offres,
    compromis: withSales ? src.compromis : 0,
    actes: withSales ? src.actes : 0,
    ca: withSales ? src.actes * avgAct : 0,
  });

  return MONTHS_2026.map((m) => {
    let v: MonthVol;
    if (m.key === "11") v = volFrom(remainder, true); // novembre = reste
    else if (m.key === "09" || m.key === "10") v = volFrom(base, true); // sept/oct
    else if (m.key === "06" || m.key === "07" || m.key === "08")
      v = volFrom(base, false); // mois pont (pas de vente)
    else v = volFrom(base, true); // jan→mai (historique)
    return monthRecord(profileId, m, v);
  });
}

// ─── Les 5 profils ──────────────────────────────────────────────────────────

/** Objectif personnel calibré : réalisé depuis janvier ≈ 75-85 % au prorata. */
const STD_OBJECTIVE = { annualCA: 90000, avgActValue: 9000 };

/** Saisies du profil « actuel » = données historiques de `m-demo` (inchangées). */
const CURRENT_PROFILE_RESULTS = [...mockJanuaryResults, ...mockResults].filter(
  (r) => r.userId === DEMO_PROFILE_USER_ID
);

export const DEMO_PROFILES: DemoProfile[] = [
  {
    id: "actuel",
    label: "Profil actuel",
    category: "expert",
    objective: { annualCA: 70000, avgActValue: 14000 },
    expectedPainPoint: null,
    results: CURRENT_PROFILE_RESULTS,
  },
  {
    id: "lea",
    label: "Léa — rate ses mandats",
    category: "confirme",
    objective: STD_OBJECTIVE,
    expectedPainPoint: "estimations_mandats",
    results: buildProfileMonths("lea", [180, 18, 3, 0, 40, 24, 36, 3, 3, 3], 9000),
  },
  {
    id: "karim",
    label: "Karim — bloqué visite → offre",
    category: "confirme",
    objective: STD_OBJECTIVE,
    expectedPainPoint: "visites_offres",
    results: buildProfileMonths("karim", [144, 9, 6, 3, 40, 30, 90, 3, 3, 3], 9000),
  },
  {
    id: "sophie",
    label: "Sophie — offres qui ne passent pas",
    category: "confirme",
    objective: STD_OBJECTIVE,
    expectedPainPoint: "offres_compromis",
    results: buildProfileMonths("sophie", [150, 9, 5, 2, 32, 24, 60, 15, 3, 3], 9000),
  },
  {
    id: "marc",
    label: "Marc — prospection faible",
    category: "confirme",
    objective: STD_OBJECTIVE,
    expectedPainPoint: "contacts_estimations",
    results: buildProfileMonths("marc", [240, 8, 4, 2, 32, 24, 60, 6, 3, 3], 9000),
  },
];

export const DEFAULT_DEMO_PROFILE_ID = "actuel";

/** Clé de mémorisation du profil démo choisi. */
export const DEMO_PROFILE_STORAGE_KEY = "nxt-demo-profile";

export function getDemoProfile(id: string): DemoProfile {
  return DEMO_PROFILES.find((p) => p.id === id) ?? DEMO_PROFILES[0];
}
