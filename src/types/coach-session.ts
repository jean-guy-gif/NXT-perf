// src/types/coach-session.ts

export type CoachUIState =
  | 'idle' | 'prompted' | 'listening' | 'processing'
  | 'speaking' | 'confirming' | 'saving' | 'reading'
  | 'prescribing' | 'fallback_text' | 'closed'

export type ServerStep =
  | 'prompted' | 'collecting' | 'needs_clarification'
  | 'ready_to_confirm' | 'confirming' | 'saved'
  | 'reading' | 'prescribing' | 'closed'

export type KpiField =
  | 'contacts_totaux' | 'estimations_realisees' | 'mandats_signes'
  | 'mandats_exclusifs' | 'acheteurs_chauds' | 'acheteurs_sortis_visite'
  | 'nombre_visites' | 'offres_recues' | 'compromis_signes'
  | 'actes_signes' | 'chiffre_affaires'

export type KpiStatus = 'missing' | 'inferred' | 'needs_confirmation' | 'confirmed'
export type KpiSource = 'llm_extraction' | 'user_correction' | 'inferred'

export interface KpiEntry {
  value: number
  confidence: number   // [0, 1]
  status: KpiStatus
  source: KpiSource
}

export type ExtractedKpis = Partial<Record<KpiField, KpiEntry>>

export interface DraftStatus {
  confirmed_fields: number
  missing_priority: KpiField[]
  uncertain_fields: KpiField[]
  can_confirm: boolean
}

export interface PrescriptionCard {
  id?: string
  brique: 'nxt_training' | 'nxt_profiling'
  module: 'prospection' | 'mandats' | 'acheteurs' | null
  label: string
  projected_ca_gain: number | null
}

export type CoachTriggerType = 'ratio_rouge' | 'lundi_sans_debrief' | 'bouton_manuel'

export interface CoachTrigger {
  trigger_type: CoachTriggerType
  trigger_context?: {
    ratio_id?: string
    ratio_value?: number
  }
}

export interface TurnResponse {
  session_id: string
  client_turn_id: string
  ui_state: CoachUIState
  server_step: ServerStep
  coach_text: string
  draft_status: DraftStatus
}

export interface SessionStartResponse {
  session_id: string
  persona: string
  ui_state: CoachUIState
  server_step: ServerStep
  coach_text: string
  draft_status: DraftStatus
  client_turn_id: null
}

export interface SessionResumeResponse {
  can_resume: boolean
  session_id?: string
  ui_state?: CoachUIState
  server_step?: ServerStep
  persona?: string
  coach_text?: string
  draft_status?: DraftStatus
  prescription?: PrescriptionCard | null
}

export interface ConfirmResponse {
  session_id: string
  ui_state: 'reading'
  saved: boolean
  coach_text: string
  prescription?: PrescriptionCard
}

export interface CoachErrorResponse {
  error_code: 'LLM_TIMEOUT' | 'DRAFT_PATCH_FAILED' | 'SESSION_NOT_FOUND' | 'SESSION_EXPIRED'
  recoverable: boolean
  message?: string
}
