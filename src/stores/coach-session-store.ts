// src/stores/coach-session-store.ts
import { create } from 'zustand'
import type {
  CoachUIState, ServerStep, DraftStatus, PrescriptionCard,
  CoachTrigger, SessionStartResponse, SessionResumeResponse,
  TurnResponse, ConfirmResponse,
} from '@/types/coach-session'
import type { PersonaId } from '@/lib/personas'

interface CoachSessionState {
  // Session
  sessionId: string | null
  persona: PersonaId | null
  pendingTurnId: string | null

  // UI state
  uiState: CoachUIState
  serverStep: ServerStep | null

  // Contenu
  coachText: string | null
  transcriptPartial: string
  draftStatus: DraftStatus | null
  prescription: PrescriptionCard | null

  // Actions UI
  setUIState: (s: CoachUIState) => void
  setTranscriptPartial: (t: string) => void
  clearTranscriptPartial: () => void

  // Actions serveur
  startSession: (trigger: CoachTrigger) => Promise<void>
  resumeSession: () => Promise<void>
  sendTurn: (transcript: string, channel: 'voice' | 'text') => Promise<void>
  confirmSession: () => Promise<void>
  respondPrescription: (r: 'accepted' | 'refused') => Promise<void>
  dismissUI: () => void
  abandonSession: () => Promise<void>
}

let isStartingSession = false  // mutex contre double déclenchement

export const useCoachSession = create<CoachSessionState>((set, get) => ({
  sessionId: null,
  persona: null,
  pendingTurnId: null,
  uiState: 'idle',
  serverStep: null,
  coachText: null,
  transcriptPartial: '',
  draftStatus: null,
  prescription: null,

  setUIState: (s) => set({ uiState: s }),
  setTranscriptPartial: (t) => set({ transcriptPartial: t }),
  clearTranscriptPartial: () => set({ transcriptPartial: '' }),

  startSession: async (trigger) => {
    if (get().uiState !== 'idle' || isStartingSession) return
    isStartingSession = true
    set({ uiState: 'prompted' })
    try {
      const res = await fetch('/api/coach/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trigger),
      })
      const data: SessionStartResponse = await res.json()
      set({
        sessionId: data.session_id,
        persona: data.persona as PersonaId,
        uiState: data.ui_state,
        serverStep: data.server_step,
        coachText: data.coach_text,
        draftStatus: data.draft_status,
        prescription: null,
        pendingTurnId: null,
      })
    } catch {
      set({ uiState: 'idle' })
    } finally {
      isStartingSession = false
    }
  },

  resumeSession: async () => {
    const res = await fetch('/api/coach/session/resume', { method: 'POST' })
    const data: SessionResumeResponse = await res.json()
    if (!data.can_resume) return
    set({
      sessionId: data.session_id ?? null,
      persona: (data.persona as PersonaId) ?? null,
      uiState: data.ui_state ?? 'idle',
      serverStep: data.server_step ?? null,
      coachText: data.coach_text ?? null,
      draftStatus: data.draft_status ?? null,
      prescription: data.prescription ?? null,
    })
  },

  sendTurn: async (transcript, channel) => {
    const { sessionId } = get()
    if (!sessionId) return
    const client_turn_id = crypto.randomUUID()
    set({ pendingTurnId: client_turn_id, uiState: 'processing', transcriptPartial: '' })
    try {
      const res = await fetch('/api/coach/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, transcript_final: transcript, channel, client_turn_id }),
      })
      const data: TurnResponse = await res.json()
      // Ignorer les réponses hors ordre
      if (get().pendingTurnId !== client_turn_id) return
      set({
        uiState: data.ui_state,
        serverStep: data.server_step,
        coachText: data.coach_text,
        draftStatus: data.draft_status,
        pendingTurnId: null,
      })
    } catch {
      set({ uiState: 'fallback_text', pendingTurnId: null })
    }
  },

  confirmSession: async () => {
    const { sessionId } = get()
    if (!sessionId) return
    set({ uiState: 'saving' })
    const res = await fetch('/api/coach/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, confirmed: true }),
    })
    const data: ConfirmResponse = await res.json()
    set({
      uiState: data.ui_state,
      serverStep: 'reading',
      coachText: data.coach_text,
      prescription: data.prescription ?? null,
    })
  },

  respondPrescription: async (response) => {
    const { sessionId, prescription } = get()
    if (!sessionId || !prescription?.id) return
    await fetch('/api/coach/prescription/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, prescription_id: prescription.id, response }),
    })
    set({ uiState: 'closed', serverStep: 'closed' })
  },

  dismissUI: () => set({
    uiState: 'idle', sessionId: null, persona: null,
    serverStep: null, coachText: null, draftStatus: null,
    prescription: null, pendingTurnId: null, transcriptPartial: '',
  }),

  abandonSession: async () => {
    const { sessionId } = get()
    if (sessionId) {
      await fetch('/api/coach/session/abandon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      }).catch(() => {/* best-effort */})
    }
    get().dismissUI()
  },
}))
