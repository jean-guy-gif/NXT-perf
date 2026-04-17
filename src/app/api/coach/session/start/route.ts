// src/app/api/coach/session/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isValidPersona, DEFAULT_PERSONA } from '@/lib/personas'
import { loadUserCoachContext } from '@/lib/coach-context'
import type { CoachTriggerType } from '@/types/coach-session'

const START_TEMPLATES: Record<CoachTriggerType, string> = {
  ratio_rouge:        "On a un point à regarder ensemble cette semaine. Tu m'accordes 2 minutes ?",
  lundi_sans_debrief: "C'est lundi. Tu me racontes ta semaine ?",
  bouton_manuel:      "On fait le point sur ta semaine ?",
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { allowed } = checkRateLimit(`coach-start:${auth.user.id}`, 10, 60_000)
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const trigger_type: CoachTriggerType = body.trigger_type ?? 'bouton_manuel'
  const trigger_context = body.trigger_context ?? null

  const supabase = await createServerSupabaseClient()
  const ctx = await loadUserCoachContext(supabase, auth.user.id)

  const persona = isValidPersona(ctx.profile?.coach_persona)
    ? ctx.profile!.coach_persona
    : DEFAULT_PERSONA

  // Récupérer org_id depuis profiles
  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', auth.user.id).single()
  const org_id = (profile as any)?.org_id ?? auth.user.id

  // Créer la session
  const { data: session, error: sessErr } = await supabase.from('coach_sessions').insert({
    user_id: auth.user.id,
    org_id,
    persona_used: persona,
    trigger_type,
    trigger_context,
  }).select('id').single()

  if (sessErr || !session) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }

  // Créer le draft vide
  await supabase.from('coach_draft_states').insert({ session_id: session.id })

  const coach_text = START_TEMPLATES[trigger_type]

  // Logger le premier message coach
  await supabase.from('coach_messages').insert({
    session_id: session.id,
    role: 'coach',
    channel: 'voice',
    coach_text,
  })

  return NextResponse.json({
    session_id: session.id,
    persona,
    ui_state: 'speaking',
    server_step: 'prompted',
    coach_text,
    draft_status: {
      confirmed_fields: 0,
      missing_priority: ['mandats_signes', 'mandats_exclusifs', 'contacts_totaux', 'estimations_realisees'],
      uncertain_fields: [],
      can_confirm: false,
    },
    client_turn_id: null,
  })
}
