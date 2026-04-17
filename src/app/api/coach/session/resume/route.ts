// src/app/api/coach/session/resume/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const TTL_MINUTES = parseInt(process.env.COACH_SESSION_TTL_MINUTES ?? '30')

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const supabase = await createServerSupabaseClient()
  const body = await request.json().catch(() => ({}))

  const ttlCutoff = new Date(Date.now() - TTL_MINUTES * 60 * 1000).toISOString()

  // Chercher session active OU saved+reading/prescribing
  let query = supabase
    .from('coach_sessions')
    .select('*, coach_draft_states(*)')
    .eq('user_id', auth.user.id)
    .in('status', ['active', 'saved'])
    .order('started_at', { ascending: false })
    .limit(1)

  if (body.session_id) {
    query = query.eq('id', body.session_id)
  }

  const { data: sessions } = await query
  const session = sessions?.[0]

  if (!session) return NextResponse.json({ can_resume: false })

  // Vérifier TTL pour les sessions active
  if (session.status === 'active') {
    const draft = session.coach_draft_states
    if (!draft || draft.updated_at < ttlCutoff) {
      return NextResponse.json({ can_resume: false })
    }
  }

  // Pour saved : accepter seulement si current_step in ('reading','prescribing')
  if (session.status === 'saved' && !['reading', 'prescribing'].includes(session.current_step)) {
    return NextResponse.json({ can_resume: false })
  }

  // Récupérer le dernier message coach
  const { data: lastMessages } = await supabase
    .from('coach_messages')
    .select('coach_text')
    .eq('session_id', session.id)
    .eq('role', 'coach')
    .eq('turn_status', 'ok')
    .order('created_at', { ascending: false })
    .limit(1)

  const coach_text = lastMessages?.[0]?.coach_text ?? "On reprend là où on s'est arrêté."

  // Récupérer prescription si prescribing
  let prescription = null
  if (session.current_step === 'prescribing') {
    const { data: presc } = await supabase
      .from('coach_prescriptions')
      .select('*')
      .eq('session_id', session.id)
      .is('user_response', null)
      .single()
    if (presc) prescription = presc
  }

  return NextResponse.json({
    can_resume: true,
    session_id: session.id,
    ui_state: session.current_step === 'reading' ? 'reading' : session.current_step === 'prescribing' ? 'prescribing' : 'confirming',
    server_step: session.current_step,
    persona: session.persona_used,
    coach_text,
    draft_status: {
      confirmed_fields: Object.keys(session.coach_draft_states?.extracted_kpis ?? {}).length,
      missing_priority: session.coach_draft_states?.unresolved_fields ?? [],
      uncertain_fields: [],
      can_confirm: session.current_step === 'ready_to_confirm',
    },
    prescription,
  })
}
