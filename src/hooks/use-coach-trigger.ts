'use client'
import { useEffect, useRef } from 'react'
import { useCoachSession } from '@/stores/coach-session-store'
import { useAppStore } from '@/stores/app-store'
import { buildCooldownKey, isCooldownActive, setCooldown, shouldTriggerLundi } from '@/lib/coach-trigger-utils'

const COOLDOWN_7_DAYS = 7 * 24 * 60 * 60 * 1000

export function useCoachTrigger() {
  const uiState = useCoachSession(s => s.uiState)
  const startSession = useCoachSession(s => s.startSession)
  const user = useAppStore(s => s.user)
  const results = useAppStore(s => s.results)
  const hasTriggered = useRef(false)

  useEffect(() => {
    // Attendre que resumeSession ait répondu (uiState !== 'idle' = session active, pas de bulle)
    if (uiState !== 'idle') return
    if (!user?.id) return
    if (hasTriggered.current) return

    const userId = user.id

    // Signal 1 : ratio rouge — lire les résultats du store
    const latestResult = results?.[0]
    if (latestResult) {
      const visites = (latestResult as any).acheteurs?.nombreVisites ?? 0
      const offres = (latestResult as any).acheteurs?.offresRecues ?? 0
      if (visites >= 2 && offres === 0) {
        const key = buildCooldownKey(userId, 'ratio_rouge', 'visites_offres')
        if (!isCooldownActive(key)) {
          setTimeout(() => {
            if (useCoachSession.getState().uiState !== 'idle') return
            hasTriggered.current = true
            setCooldown(key, COOLDOWN_7_DAYS)
            startSession({ trigger_type: 'ratio_rouge', trigger_context: { ratio_id: 'visites_offres', ratio_value: visites } })
          }, 3000)
          return
        }
      }
    }

    // Signal 2 : lundi sans débrief
    if (shouldTriggerLundi()) {
      const key = buildCooldownKey(userId, 'lundi_sans_debrief')
      if (!isCooldownActive(key)) {
        setTimeout(() => {
          if (useCoachSession.getState().uiState !== 'idle') return
          hasTriggered.current = true
          setCooldown(key, COOLDOWN_7_DAYS)
          startSession({ trigger_type: 'lundi_sans_debrief' })
        }, 2000)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiState, user?.id])
}
