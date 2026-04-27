import type { PeriodResults } from "@/types/results";
import type { UserCategory } from "@/types/user";
import type { RatioConfig, RatioId } from "@/types/ratios";
import { CATEGORY_OBJECTIVES } from "@/lib/constants";

// ─── Verdict (CA / actes / mandats) ──────────────────────────────────────

export interface VerdictData {
  ca: number;
  actes: number;
  mandats: number;
}

export function extractVerdict(r: PeriodResults | null): VerdictData {
  if (!r) return { ca: 0, actes: 0, mandats: 0 };
  return {
    ca: r.ventes.chiffreAffaires,
    actes: r.ventes.actesSignes,
    mandats: r.vendeurs.mandatsSignes,
  };
}

// ─── Axes (raw + normalized) ──────────────────────────────────────────────

export interface Axis {
  id: string;
  label: string;
  me: number;
  other: number;
}

export interface NormalizedAxis {
  id: string;
  label: string;
  meNormalized: number;
  otherNormalized: number;
  meRaw: number;
  otherRaw: number;
}

export function normalizeAxes(axes: Axis[]): NormalizedAxis[] {
  return axes.map((axis) => {
    const max = Math.max(axis.me, axis.other, 1);
    return {
      id: axis.id,
      label: axis.label,
      meNormalized: (axis.me / max) * 100,
      otherNormalized: (axis.other / max) * 100,
      meRaw: axis.me,
      otherRaw: axis.other,
    };
  });
}

// ─── Volume axes (intensité commerciale) ──────────────────────────────────

export function buildVolumeAxes(
  me: PeriodResults | null,
  other: PeriodResults | null,
): Axis[] {
  const safe = (r: PeriodResults | null) => ({
    contacts: r?.prospection.contactsTotaux ?? 0,
    estimations: r?.vendeurs.estimationsRealisees ?? 0,
    mandats: r?.vendeurs.mandatsSignes ?? 0,
    visites: r?.acheteurs.nombreVisites ?? 0,
    offres: r?.acheteurs.offresRecues ?? 0,
    compromis: r?.acheteurs.compromisSignes ?? 0,
    actes: r?.ventes.actesSignes ?? 0,
  });
  const m = safe(me);
  const o = safe(other);
  return [
    { id: "contacts", label: "Contacts", me: m.contacts, other: o.contacts },
    { id: "estimations", label: "Estimations", me: m.estimations, other: o.estimations },
    { id: "mandats", label: "Mandats", me: m.mandats, other: o.mandats },
    { id: "visites", label: "Visites", me: m.visites, other: o.visites },
    { id: "offres", label: "Offres", me: m.offres, other: o.offres },
    { id: "compromis", label: "Compromis", me: m.compromis, other: o.compromis },
    { id: "actes", label: "Actes", me: m.actes, other: o.actes },
  ];
}

// ─── Efficiency axes (taux de transformation) ─────────────────────────────

export function pctRatio(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 100) : 0;
}

export function computeExclusivityRate(r: PeriodResults | null): number {
  if (!r) return 0;
  const total = r.vendeurs.mandats.length;
  if (total === 0) return 0;
  const exclu = r.vendeurs.mandats.filter((m) => m.type === "exclusif").length;
  return Math.round((exclu / total) * 100);
}

export function buildEfficiencyAxes(
  me: PeriodResults | null,
  other: PeriodResults | null,
): Axis[] {
  return [
    {
      id: "contactsToEstim",
      label: "Contact → Estim",
      me: pctRatio(me?.vendeurs.estimationsRealisees ?? 0, me?.prospection.contactsTotaux ?? 0),
      other: pctRatio(other?.vendeurs.estimationsRealisees ?? 0, other?.prospection.contactsTotaux ?? 0),
    },
    {
      id: "estimToMandat",
      label: "Estim → Mandat",
      me: pctRatio(me?.vendeurs.mandatsSignes ?? 0, me?.vendeurs.estimationsRealisees ?? 0),
      other: pctRatio(other?.vendeurs.mandatsSignes ?? 0, other?.vendeurs.estimationsRealisees ?? 0),
    },
    {
      id: "exclu",
      label: "% Exclusivité",
      me: computeExclusivityRate(me),
      other: computeExclusivityRate(other),
    },
    {
      id: "acheteursToVisite",
      label: "Acheteur → Visite",
      me: pctRatio(me?.acheteurs.nombreVisites ?? 0, me?.acheteurs.acheteursSortisVisite ?? 0),
      other: pctRatio(other?.acheteurs.nombreVisites ?? 0, other?.acheteurs.acheteursSortisVisite ?? 0),
    },
    {
      id: "visiteToOffre",
      label: "Visite → Offre",
      me: pctRatio(me?.acheteurs.offresRecues ?? 0, me?.acheteurs.nombreVisites ?? 0),
      other: pctRatio(other?.acheteurs.offresRecues ?? 0, other?.acheteurs.nombreVisites ?? 0),
    },
    {
      id: "offreToCompromis",
      label: "Offre → Compromis",
      me: pctRatio(me?.acheteurs.compromisSignes ?? 0, me?.acheteurs.offresRecues ?? 0),
      other: pctRatio(other?.acheteurs.compromisSignes ?? 0, other?.acheteurs.offresRecues ?? 0),
    },
    {
      id: "compromisToActe",
      label: "Compromis → Acte",
      me: pctRatio(me?.ventes.actesSignes ?? 0, me?.acheteurs.compromisSignes ?? 0),
      other: pctRatio(other?.ventes.actesSignes ?? 0, other?.acheteurs.compromisSignes ?? 0),
    },
  ];
}

// ─── Profile synthetic results ────────────────────────────────────────────

export function buildProfileResults(
  profile: UserCategory,
  ratioConfigs: Record<RatioId, RatioConfig>,
  monthsInPeriod: number,
): PeriodResults {
  const obj = CATEGORY_OBJECTIVES[profile];
  const mult = Math.max(1, monthsInPeriod);

  const estimations = obj.estimations * mult;
  const mandats = obj.mandats * mult;
  const visites = obj.visites * mult;
  const offres = obj.offres * mult;
  const compromis = obj.compromis * mult;
  const actes = obj.actes * mult;
  const ca = obj.ca * mult;

  const contactsTarget = Math.round(
    estimations * ratioConfigs.contacts_rdv.thresholds[profile],
  );
  const numExclu = Math.floor((mandats * obj.exclusivite) / 100);
  const acheteursTarget = Math.max(
    1,
    Math.ceil(visites / ratioConfigs.acheteurs_visites.thresholds[profile]),
  );
  const avgAct = actes > 0 ? ca / actes : 0;
  const now = new Date().toISOString();
  return {
    id: "profile-synth",
    userId: "profile-synth",
    periodType: "month",
    periodStart: now,
    periodEnd: now,
    prospection: {
      contactsTotaux: contactsTarget,
      rdvEstimation: estimations,
    },
    vendeurs: {
      rdvEstimation: estimations,
      estimationsRealisees: estimations,
      mandatsSignes: mandats,
      mandats: Array.from({ length: mandats }, (_, i) => ({
        id: `profile-mandat-${i}`,
        type: i < numExclu ? ("exclusif" as const) : ("simple" as const),
      })),
      rdvSuivi: 0,
      requalificationSimpleExclusif: 0,
      baissePrix: 0,
    },
    acheteurs: {
      acheteursSortisVisite: acheteursTarget,
      nombreVisites: visites,
      offresRecues: offres,
      compromisSignes: compromis,
      chiffreAffairesCompromis: Math.round(compromis * avgAct),
    },
    ventes: {
      actesSignes: actes,
      chiffreAffaires: ca,
    },
    createdAt: now,
    updatedAt: now,
  };
}
