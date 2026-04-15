// src/lib/coach-decision-engine.ts
import type { ExtractedKpis, KpiEntry, KpiField, ServerStep } from '@/types/coach-session'

// ── Priorité de relance — figée ───────────────────────────────────────────────
export const RELANCE_PRIORITY: KpiField[] = [
  'mandats_signes', 'mandats_exclusifs',
  'contacts_totaux', 'estimations_realisees',
  'nombre_visites', 'offres_recues',
  'actes_signes', 'chiffre_affaires',
]

// ── Matrice prescription V1 ───────────────────────────────────────────────────
const PRESCRIPTION_MAP: Record<string, { brique: 'nxt_training' | 'nxt_profiling'; module: 'prospection' | 'mandats' | 'acheteurs' | null }> = {
  contacts_estimations: { brique: 'nxt_training', module: 'prospection' },
  estimations_mandats:  { brique: 'nxt_training', module: 'prospection' },
  taux_exclusivite:     { brique: 'nxt_training', module: 'mandats' },
  visites_offres:       { brique: 'nxt_training', module: 'acheteurs' },
  acheteurs_sorties:    { brique: 'nxt_training', module: 'acheteurs' },
}

// ── Validation KPI ────────────────────────────────────────────────────────────
export function validateKpiPatch(entry: KpiEntry): void {
  if (!Number.isInteger(entry.value) || entry.value < 0)
    throw new Error(`KPI value must be a non-negative integer, got ${entry.value}`)
  if (entry.confidence < 0 || entry.confidence > 1)
    throw new Error(`KPI confidence must be in [0, 1], got ${entry.confidence}`)
  const validStatuses = ['missing', 'inferred', 'needs_confirmation', 'confirmed']
  if (!validStatuses.includes(entry.status))
    throw new Error(`KPI status must be one of ${validStatuses.join('|')}, got ${entry.status}`)
  const validSources = ['llm_extraction', 'user_correction', 'inferred']
  if (!validSources.includes(entry.source))
    throw new Error(`KPI source must be one of ${validSources.join('|')}, got ${entry.source}`)
}

// ── computeNextStep ───────────────────────────────────────────────────────────
export interface NextStepResult {
  next_step: ServerStep
  clarification_targets: KpiField[]
  can_confirm: boolean
  forced_null_fields: KpiField[]
}

export function computeNextStep(draft: ExtractedKpis, relanceCount: number): NextStepResult {
  const missingPriority = RELANCE_PRIORITY.filter(field => {
    const entry = draft[field]
    return !entry || entry.status === 'missing'
  })

  // Après 3 relances : forcer ready_to_confirm avec champs nuls explicites
  if (relanceCount >= 3 && missingPriority.length > 0) {
    return {
      next_step: 'ready_to_confirm',
      clarification_targets: [],
      can_confirm: true,
      forced_null_fields: missingPriority,
    }
  }

  if (missingPriority.length === 0) {
    return {
      next_step: 'ready_to_confirm',
      clarification_targets: [],
      can_confirm: true,
      forced_null_fields: [],
    }
  }

  return {
    next_step: 'collecting',
    clarification_targets: missingPriority.slice(0, 2),
    can_confirm: false,
    forced_null_fields: [],
  }
}

// ── selectReadingSignal ───────────────────────────────────────────────────────
export interface ReadingSignal {
  type: 'ratio_rouge' | 'tendance' | 'dpi_faible'
  ratio_id?: string
  message_hint: string  // contexte pour le prompt LLM
}

export function selectReadingSignal(
  draft: ExtractedKpis,
  ratioStatuses: Record<string, 'ok' | 'warning' | 'danger'>,
): ReadingSignal {
  // Priorité 1 : ratio rouge
  const rougeRatio = Object.entries(ratioStatuses).find(([, s]) => s === 'danger')
  if (rougeRatio) {
    return { type: 'ratio_rouge', ratio_id: rougeRatio[0], message_hint: `ratio ${rougeRatio[0]} en zone critique` }
  }
  // Priorité 2 : tendance (défaut si pas de rouge)
  return { type: 'tendance', message_hint: 'lecture globale de la semaine' }
}

// ── evaluatePrescription ─────────────────────────────────────────────────────
export interface PrescriptionDecision {
  brique: 'nxt_training' | 'nxt_profiling'
  module: 'prospection' | 'mandats' | 'acheteurs' | null
  ratio_id: string
}

export function evaluatePrescription(params: {
  weakAxis: string | null
  activeSubscriptions: string[]
  prescriptionHistory: Array<{ prescribed_at: string; brique: string }>
}): PrescriptionDecision | null {
  const { weakAxis, activeSubscriptions, prescriptionHistory } = params

  if (!weakAxis) return null

  const prescriptionSpec = PRESCRIPTION_MAP[weakAxis]
  if (!prescriptionSpec) return null

  // Condition 2 : brique non déjà active
  if (activeSubscriptions.includes(prescriptionSpec.brique)) return null

  // Condition 3 : pas de prescription < 7 jours
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recentPrescription = prescriptionHistory.find(
    p => new Date(p.prescribed_at).getTime() > sevenDaysAgo
  )
  if (recentPrescription) return null

  return { ...prescriptionSpec, ratio_id: weakAxis }
}
