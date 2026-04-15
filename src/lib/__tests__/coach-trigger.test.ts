import { describe, it, expect } from 'vitest'
import { buildCooldownKey, shouldTriggerLundi } from '../coach-trigger-utils'

describe('buildCooldownKey', () => {
  it('includes userId, trigger_type and ratio_id for ratio_rouge', () => {
    const key = buildCooldownKey('user-1', 'ratio_rouge', 'visites_offres')
    expect(key).toBe('coach_bubble:user-1:ratio_rouge:visites_offres')
  })

  it('does not include ratio_id for lundi_sans_debrief', () => {
    const key = buildCooldownKey('user-1', 'lundi_sans_debrief')
    expect(key).toBe('coach_bubble:user-1:lundi_sans_debrief')
  })
})

describe('shouldTriggerLundi', () => {
  it('returns true on a Monday in Europe/Paris', () => {
    // 2026-04-13 09:00 Europe/Paris = Monday
    const monday = new Date('2026-04-13T07:00:00Z') // UTC = 09:00 Paris
    expect(shouldTriggerLundi(monday)).toBe(true)
  })

  it('returns false on a Sunday', () => {
    const sunday = new Date('2026-04-12T07:00:00Z')
    expect(shouldTriggerLundi(sunday)).toBe(false)
  })
})
