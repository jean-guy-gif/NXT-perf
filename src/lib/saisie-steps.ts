/**
 * Shared question configuration for weekly performance entry.
 * Single source of truth used by both voice and manual modes.
 *
 * 19 steps, 4 sections, aligned with PRD section 9 field mapping.
 */

import type { ExtractedFields } from "@/lib/saisie-ai-client";

// ── Types ────────────────────────────────────────────────────────────────────

export type StepInputMode = "count" | "money" | "detail_mandats" | "detail_infos" | "detail_acheteurs";

export interface SaisieStep {
  /** Unique step identifier */
  id: string;
  /** Display section label */
  section: "Prospection" | "Vendeurs" | "Acheteurs" | "Ventes";
  /** Question displayed to the user */
  prompt: string;
  /** Target field(s) in ExtractedFields or arrays */
  field: string;
  /** Input mode — determines parser and input type */
  inputMode: StepInputMode;
  /** Keyboard input mode for mobile */
  keyboardMode: "numeric" | "text";
  /** Placeholder for the input field */
  placeholder: string;
  /** Optional hint displayed below the input */
  exampleHint?: string;
  /** If true, field is required (empty → 0 for count, [] for detail) */
  required: boolean;
  /** Only show this step if condition returns true */
  condition?: (fields: ExtractedFields) => boolean;
  /** What to store when user submits empty */
  emptyValue: "zero" | "empty_array";
}

// ── Steps ────────────────────────────────────────────────────────────────────

export const SAISIE_STEPS: SaisieStep[] = [
  // ── Prospection ────────────────────────────────────────────────────────
  {
    id: "contactsTotaux",
    section: "Prospection",
    prompt: "Combien de contacts au total ?",
    field: "contactsTotaux",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: true,
    emptyValue: "zero",
  },
  {
    id: "contactsEntrants",
    section: "Prospection",
    prompt: "Combien de contacts entrants ?",
    field: "contactsEntrants",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: true,
    emptyValue: "zero",
  },
  {
    id: "rdvEstimation",
    section: "Prospection",
    prompt: "Combien de RDV estimation ?",
    field: "rdvEstimation",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: false,
    emptyValue: "zero",
  },
  {
    id: "infosVenteCount",
    section: "Prospection",
    prompt: "Combien d'infos de vente ?",
    field: "infosVenteCount",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: false,
    emptyValue: "zero",
  },
  {
    id: "infosVenteDetail",
    section: "Prospection",
    prompt: "Donne les noms et un mot sur chaque projet.",
    field: "infosVenteDetail",
    inputMode: "detail_infos",
    keyboardMode: "text",
    placeholder: "Dupont retraite, Leroy succession",
    exampleHint: "Nom + contexte, séparés par des virgules",
    required: false,
    condition: (f) => ((f as Record<string, number>)["infosVenteCount"] ?? 0) > 0,
    emptyValue: "empty_array",
  },

  // ── Vendeurs ───────────────────────────────────────────────────────────
  {
    id: "estimationsRealisees",
    section: "Vendeurs",
    prompt: "Combien d'estimations réalisées ?",
    field: "estimationsRealisees",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: true,
    emptyValue: "zero",
  },
  {
    id: "mandatsSignes",
    section: "Vendeurs",
    prompt: "Combien de mandats signés ?",
    field: "mandatsSignes",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: true,
    emptyValue: "zero",
  },
  {
    id: "mandatsDetail",
    section: "Vendeurs",
    prompt: "Donne les noms et le type de mandat.",
    field: "mandatsDetail",
    inputMode: "detail_mandats",
    keyboardMode: "text",
    placeholder: "Dupont exclusif, Martin simple",
    exampleHint: "Nom + type (exclusif/simple), séparés par des virgules",
    required: false,
    condition: (f) => (f.mandatsSignes ?? 0) > 0,
    emptyValue: "empty_array",
  },
  {
    id: "rdvSuivi",
    section: "Vendeurs",
    prompt: "Combien de RDV de suivi vendeurs ?",
    field: "rdvSuivi",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: false,
    emptyValue: "zero",
  },
  {
    id: "requalification",
    section: "Vendeurs",
    prompt: "Combien de requalifications simple vers exclusif ?",
    field: "requalificationSimpleExclusif",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: false,
    emptyValue: "zero",
  },
  {
    id: "baissePrix",
    section: "Vendeurs",
    prompt: "Combien de baisses de prix acceptées ?",
    field: "baissePrix",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: false,
    emptyValue: "zero",
  },

  // ── Acheteurs ──────────────────────────────────────────────────────────
  {
    id: "acheteursChaudsCount",
    section: "Acheteurs",
    prompt: "Combien de nouveaux acheteurs chauds ?",
    field: "acheteursChaudsCount",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: false,
    emptyValue: "zero",
  },
  {
    id: "acheteursDetail",
    section: "Acheteurs",
    prompt: "Donne les noms et leur projet.",
    field: "acheteursDetail",
    inputMode: "detail_acheteurs",
    keyboardMode: "text",
    placeholder: "Martin T3 Lyon, Garcia maison",
    exampleHint: "Nom + projet, séparés par des virgules",
    required: false,
    condition: (f) => (f.acheteursChaudsCount ?? 0) > 0,
    emptyValue: "empty_array",
  },
  {
    id: "acheteursSortisVisite",
    section: "Acheteurs",
    prompt: "Combien d'acheteurs sortis en visite ?",
    field: "acheteursSortisVisite",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: false,
    emptyValue: "zero",
  },
  {
    id: "nombreVisites",
    section: "Acheteurs",
    prompt: "Combien de visites au total ?",
    field: "nombreVisites",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: false,
    emptyValue: "zero",
  },
  {
    id: "offresRecues",
    section: "Acheteurs",
    prompt: "Combien d'offres reçues ?",
    field: "offresRecues",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: false,
    emptyValue: "zero",
  },
  {
    id: "compromisSignes",
    section: "Acheteurs",
    prompt: "Combien de compromis signés ?",
    field: "compromisSignes",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: false,
    emptyValue: "zero",
  },

  // ── Ventes ─────────────────────────────────────────────────────────────
  {
    id: "actesSignes",
    section: "Ventes",
    prompt: "Combien d'actes signés ?",
    field: "actesSignes",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: false,
    emptyValue: "zero",
  },
  {
    id: "chiffreAffaires",
    section: "Ventes",
    prompt: "Quel chiffre d'affaires ?",
    field: "chiffreAffaires",
    inputMode: "money",
    keyboardMode: "numeric",
    placeholder: "0",
    exampleHint: "Montant en euros",
    required: false,
    condition: (f) => (f.actesSignes ?? 0) > 0,
    emptyValue: "zero",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Get the next applicable step index from `fromIdx`, skipping steps whose condition is false */
export function getNextApplicableStep(fromIdx: number, fields: ExtractedFields): number {
  for (let i = fromIdx; i < SAISIE_STEPS.length; i++) {
    const step = SAISIE_STEPS[i];
    if (!step.condition || step.condition(fields)) return i;
  }
  return SAISIE_STEPS.length; // done
}

/** Total number of applicable steps for a given set of fields */
export function countApplicableSteps(fields: ExtractedFields): number {
  return SAISIE_STEPS.filter(s => !s.condition || s.condition(fields)).length;
}
