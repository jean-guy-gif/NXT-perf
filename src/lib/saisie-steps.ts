/**
 * Shared question configuration for weekly performance entry.
 * Single source of truth used by both voice and manual modes.
 *
 * Organisation en 3 blocs métier :
 * - Prospection vendeur
 * - Pilotage portefeuille
 * - Transaction acheteur
 */

import type { ExtractedFields } from "@/lib/saisie-ai-client";

// ── Types ────────────────────────────────────────────────────────────────────

export type StepInputMode = "count" | "money" | "mandats_types";

export type StepSection =
  | "Prospection vendeur"
  | "Pilotage portefeuille"
  | "Transaction acheteur";

export interface SaisieStep {
  id: string;
  section: StepSection;
  prompt: string;
  field: string;
  inputMode: StepInputMode;
  keyboardMode: "numeric" | "text";
  placeholder: string;
  exampleHint?: string;
  required: boolean;
  condition?: (fields: ExtractedFields) => boolean;
  emptyValue: "zero" | "empty_array";
}

// ── Steps ────────────────────────────────────────────────────────────────────

export const SAISIE_STEPS: SaisieStep[] = [
  // ── Prospection vendeur ────────────────────────────────────────────────
  {
    id: "contactsTotaux",
    section: "Prospection vendeur",
    prompt: "Combien de contacts au total ?",
    field: "contactsTotaux",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: true,
    emptyValue: "zero",
  },
  {
    id: "rdvEstimation",
    section: "Prospection vendeur",
    prompt: "Combien de RDV estimation ?",
    field: "rdvEstimation",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: false,
    emptyValue: "zero",
  },
  {
    id: "mandatsSignes",
    section: "Prospection vendeur",
    prompt: "Combien de mandats signés ?",
    field: "mandatsSignes",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: true,
    emptyValue: "zero",
  },
  {
    id: "mandatsTypes",
    section: "Prospection vendeur",
    prompt: "Pour chaque mandat, indique son type.",
    field: "mandatsTypes",
    inputMode: "mandats_types",
    keyboardMode: "text",
    placeholder: "",
    exampleHint: "Tape le type de chaque mandat — simple ou exclusif",
    required: true,
    condition: (f) => (f.mandatsSignes ?? 0) > 0,
    emptyValue: "empty_array",
  },

  // ── Pilotage portefeuille ──────────────────────────────────────────────
  {
    id: "rdvSuivi",
    section: "Pilotage portefeuille",
    prompt: "Combien de RDV de suivi vendeurs ?",
    field: "rdvSuivi",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: false,
    emptyValue: "zero",
  },
  {
    id: "baissePrix",
    section: "Pilotage portefeuille",
    prompt: "Combien de baisses de prix acceptées ?",
    field: "baissePrix",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: false,
    emptyValue: "zero",
  },
  {
    id: "requalification",
    section: "Pilotage portefeuille",
    prompt: "Combien de requalifications simple vers exclusif ?",
    field: "requalificationSimpleExclusif",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: false,
    emptyValue: "zero",
  },

  // ── Transaction acheteur ───────────────────────────────────────────────
  {
    id: "acheteursSortisVisite",
    section: "Transaction acheteur",
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
    section: "Transaction acheteur",
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
    section: "Transaction acheteur",
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
    section: "Transaction acheteur",
    prompt: "Combien de compromis signés ?",
    field: "compromisSignes",
    inputMode: "count",
    keyboardMode: "numeric",
    placeholder: "0",
    required: false,
    emptyValue: "zero",
  },
  {
    id: "chiffreAffairesCompromis",
    section: "Transaction acheteur",
    prompt: "Quel CA compromis ?",
    field: "chiffreAffairesCompromis",
    inputMode: "money",
    keyboardMode: "numeric",
    placeholder: "0",
    exampleHint: "Montant en euros",
    required: false,
    condition: (f) => (f.compromisSignes ?? 0) > 0,
    emptyValue: "zero",
  },
  {
    id: "actesSignes",
    section: "Transaction acheteur",
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
    section: "Transaction acheteur",
    prompt: "Quel CA acte ?",
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

export function getNextApplicableStep(fromIdx: number, fields: ExtractedFields): number {
  for (let i = fromIdx; i < SAISIE_STEPS.length; i++) {
    const step = SAISIE_STEPS[i];
    if (!step.condition || step.condition(fields)) return i;
  }
  return SAISIE_STEPS.length;
}

export function countApplicableSteps(fields: ExtractedFields): number {
  return SAISIE_STEPS.filter(s => !s.condition || s.condition(fields)).length;
}
