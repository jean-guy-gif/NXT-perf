// src/app/api/coach/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { selectReadingSignal, evaluatePrescription } from '@/lib/coach-decision-engine'
import { PERSONA_COACHING_TONE, isValidPersona, DEFAULT_PERSONA } from '@/lib/personas'

const LLM_MODEL = process.env.COACH_LLM_MODEL ?? 'openai/gpt-4o-mini'
const LLM_TIMEOUT = parseInt(process.env.COACH_LLM_TIMEOUT_MS ?? '8000')
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY!

async function buildReadingText(signal: { message_hint: string }, persona: string): Promise<string> {
  const tone = PERSONA_COACHING_TONE[persona as keyof typeof PERSONA_COACHING_TONE] ?? PERSONA_COACHING_TONE.kind_coach
  const controller = new AbortController()
  setTimeout(() => controller.abort(), LLM_TIMEOUT)
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: LLM_MODEL, max_tokens: 128,
        messages: [
          { role: 'system', content: `Tu es un coach immobilier. TON: ${tone}. Une seule observation courte. Pas de liste. Réponds: { "coach_text": "..." }` },
          { role: 'user', content: `Contexte de lecture: ${signal.message_hint}` },
        ],
      }),
    })
    const data = await res.json()
    const raw = data?.choices?.[0]?.message?.content ?? '{}'
    return JSON.parse(raw.replace(/```json|```/g, '').trim()).coach_text ?? "Belle semaine. Tu es dans le bon rythme."
  } catch {
    return "Belle semaine. Continue sur cette lancée."
  }
}

async function buildPrescriptionText(decision: { brique: string; module: string | null }, persona: string): Promise<string> {
  const tone = PERSONA_COACHING_TONE[persona as keyof typeof PERSONA_COACHING_TONE] ?? PERSONA_COACHING_TONE.kind_coach
  const controller = new AbortController()
  setTimeout(() => controller.abort(), LLM_TIMEOUT)
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: LLM_MODEL, max_tokens: 128,
        messages: [
          { role: 'system', content: `Tu es un coach immobilier. TON: ${tone}. Structure: lien observation → valeur brique → question ouverte. UNE seule brique. Réponds: { "coach_text": "..." }` },
          { role: 'user', content: `Prescription: brique=${decision.brique}, module=${decision.module}` },
        ],
      }),
    })
    const data = await res.json()
    const raw = data?.choices?.[0]?.message?.content ?? '{}'
    return JSON.parse(raw.replace(/```json|```/g, '').trim()).coach_text ?? "Il y a une piste concrète pour progresser sur ce point. Tu veux qu'on en parle ?"
  } catch {
    return "Il y a une ressource qui correspond exactement à ce que tu traverses. Tu veux que je te la partage ?"
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { session_id, confirmed } = await request.json()
  if (!session_id || !confirmed) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = await createServerSupabaseClient()

  // Idempotence
  const { data: session } = await supabase
    .from('coach_sessions')
    .select('*, coach_draft_states(*)')
    .eq('id', session_id)
    .eq('user_id', auth.user.id)
    .single()

  if (!session) return NextResponse.json({ error_code: 'SESSION_NOT_FOUND', recoverable: false }, { status: 404 })

  if (['saved', 'closed'].includes(session.status)) {
    const { data: lastCoach } = await supabase
      .from('coach_messages').select('coach_text')
      .eq('session_id', session_id).eq('role', 'coach').eq('turn_status', 'ok')
      .order('created_at', { ascending: false }).limit(1).single()
    return NextResponse.json({
      session_id, ui_state: 'reading', saved: true,
      coach_text: lastCoach?.coach_text ?? "Semaine enregistrée.",
    })
  }

  const persona = isValidPersona(session.persona_used) ? session.persona_used : DEFAULT_PERSONA
  const draft = session.coach_draft_states?.extracted_kpis ?? {}

  // Calculer les statuts de ratio simplifiés pour le signal de lecture
  const ratioStatuses: Record<string, 'ok' | 'warning' | 'danger'> = {}
  const visites = draft.nombre_visites?.value ?? 0
  const offres = draft.offres_recues?.value ?? 0
  if (visites > 0 && offres === 0) ratioStatuses['visites_offres'] = 'danger'

  const signal = selectReadingSignal(draft, ratioStatuses)

  // Sauvegarder status
  await supabase.from('coach_sessions').update({
    status: 'saved', current_step: 'reading', confirmed_at: new Date().toISOString(),
  }).eq('id', session_id)

  // Lecture rapide
  const reading_text = await buildReadingText(signal, persona)
  await supabase.from('coach_messages').insert({
    session_id, role: 'coach', channel: 'voice', coach_text: reading_text,
  })

  // Évaluer prescription
  const { data: subscriptions } = await supabase.from('performance_imports').select('source').eq('user_id', auth.user.id)
  const { data: prescHistory } = await supabase.from('coach_prescriptions').select('prescribed_at, brique').eq('user_id', auth.user.id).order('prescribed_at', { ascending: false }).limit(5)

  const weakAxis = Object.keys(ratioStatuses).find(k => ratioStatuses[k] === 'danger') ?? null
  const prescDecision = evaluatePrescription({
    weakAxis,
    activeSubscriptions: subscriptions?.map((s: any) => s.source) ?? [],
    prescriptionHistory: prescHistory ?? [],
  })

  let prescriptionCard = undefined
  if (prescDecision) {
    const presc_text = await buildPrescriptionText(prescDecision, persona)
    const { data: presc } = await supabase.from('coach_prescriptions').insert({
      user_id: auth.user.id,
      session_id,
      brique: prescDecision.brique,
      module: prescDecision.module,
      ratio_id: prescDecision.ratio_id,
    }).select('id').single()

    await supabase.from('coach_messages').insert({
      session_id, role: 'coach', channel: 'voice', coach_text: presc_text,
    })
    await supabase.from('coach_sessions').update({ current_step: 'prescribing' }).eq('id', session_id)

    prescriptionCard = {
      id: presc?.id,
      brique: prescDecision.brique,
      module: prescDecision.module,
      label: `NXT Training — ${prescDecision.module ?? prescDecision.brique}`,
      projected_ca_gain: null,
    }
  }

  return NextResponse.json({
    session_id, ui_state: 'reading', saved: true,
    coach_text: reading_text,
    ...(prescriptionCard ? { prescription: prescriptionCard } : {}),
  })
}
