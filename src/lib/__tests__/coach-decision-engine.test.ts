import { describe, it, expect } from 'vitest'
import {
  computeNextStep,
  validateKpiPatch,
  selectReadingSignal,
  evaluatePrescription,
} from '../coach-decision-engine'
import type { ExtractedKpis, KpiEntry } from '@/types/coach-session'

const confirmed = (value: number): KpiEntry => ({
  value, confidence: 0.95, status: 'confirmed', source: 'llm_extraction'
})

describe('computeNextStep', () => {
  it('returns collecting when priority fields are missing', () => {
    const draft: ExtractedKpis = {}
    const result = computeNextStep(draft, 0)
    expect(result.next_step).toBe('collecting')
    expect(result.can_confirm).toBe(false)
    expect(result.clarification_targets.length).toBeLessThanOrEqual(2)
  })

  it('returns ready_to_confirm when all priority fields are confirmed', () => {
    const draft: ExtractedKpis = {
      mandats_signes: confirmed(2),
      mandats_exclusifs: confirmed(1),
      contacts_totaux: confirmed(30),
      estimations_realisees: confirmed(3),
      nombre_visites: confirmed(5),
      offres_recues: confirmed(1),
      actes_signes: confirmed(0),
      chiffre_affaires: confirmed(0),
    }
    const result = computeNextStep(draft, 0)
    expect(result.can_confirm).toBe(true)
    expect(result.next_step).toBe('ready_to_confirm')
  })

  it('forces ready_to_confirm after 3 relances with explicit nulls', () => {
    const draft: ExtractedKpis = {
      mandats_signes: confirmed(2),
      mandats_exclusifs: confirmed(1),
    }
    const result = computeNextStep(draft, 3)
    expect(result.next_step).toBe('ready_to_confirm')
    expect(result.can_confirm).toBe(true)
    // Missing fields become explicit 0, not silently injected
    expect(result.forced_null_fields).toContain('contacts_totaux')
  })

  it('never returns more than 2 clarification targets', () => {
    const result = computeNextStep({}, 1)
    expect(result.clarification_targets.length).toBeLessThanOrEqual(2)
  })
})

describe('validateKpiPatch', () => {
  it('rejects confidence outside [0, 1]', () => {
    expect(() => validateKpiPatch({ value: 2, confidence: 1.5, status: 'confirmed', source: 'llm_extraction' })).toThrow()
    expect(() => validateKpiPatch({ value: 2, confidence: -0.1, status: 'confirmed', source: 'llm_extraction' })).toThrow()
  })

  it('rejects invalid status', () => {
    expect(() => validateKpiPatch({ value: 2, confidence: 0.9, status: 'bad' as any, source: 'llm_extraction' })).toThrow()
  })

  it('rejects non-integer value', () => {
    expect(() => validateKpiPatch({ value: -1, confidence: 0.9, status: 'confirmed', source: 'llm_extraction' })).toThrow()
  })

  it('accepts valid entry', () => {
    expect(() => validateKpiPatch({ value: 3, confidence: 0.95, status: 'confirmed', source: 'llm_extraction' })).not.toThrow()
  })
})

describe('evaluatePrescription', () => {
  it('returns null when no weak axis', () => {
    const result = evaluatePrescription({
      weakAxis: null,
      activeSubscriptions: [],
      prescriptionHistory: [],
    })
    expect(result).toBeNull()
  })

  it('returns null when brique already subscribed', () => {
    const result = evaluatePrescription({
      weakAxis: 'visites_offres',
      activeSubscriptions: ['nxt_training'],
      prescriptionHistory: [],
    })
    expect(result).toBeNull()
  })

  it('returns null when prescription < 7 days ago', () => {
    const recent = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const result = evaluatePrescription({
      weakAxis: 'visites_offres',
      activeSubscriptions: [],
      prescriptionHistory: [{ prescribed_at: recent, brique: 'nxt_training' } as any],
    })
    expect(result).toBeNull()
  })

  it('returns prescription when all 3 conditions met', () => {
    const result = evaluatePrescription({
      weakAxis: 'visites_offres',
      activeSubscriptions: [],
      prescriptionHistory: [],
    })
    expect(result).not.toBeNull()
    expect(result?.brique).toBe('nxt_training')
    expect(result?.module).toBe('acheteurs')
  })
})

describe('selectReadingSignal', () => {
  it('returns ratio_rouge when danger ratio exists', () => {
    const result = selectReadingSignal({}, { visites_offres: 'danger', estimations_mandats: 'ok' })
    expect(result.type).toBe('ratio_rouge')
    expect(result.ratio_id).toBe('visites_offres')
  })

  it('returns tendance when no danger ratio', () => {
    const result = selectReadingSignal({}, { visites_offres: 'warning', estimations_mandats: 'ok' })
    expect(result.type).toBe('tendance')
  })
})
