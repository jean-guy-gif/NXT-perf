// src/app/api/coach/turn/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { computeNextStep, validateKpiPatch } from '@/lib/coach-decision-engine'
import { PERSONA_COACHING_TONE, isValidPersona, DEFAULT_PERSONA } from '@/lib/personas'
import type { ExtractedKpis, KpiField } from '@/types/coach-session'

const LLM_MODEL = process.env.COACH_LLM_MODEL ?? 'openai/gpt-4o-mini'
const LLM_TIMEOUT = parseInt(process.env.COACH_LLM_TIMEOUT_MS ?? '8000')
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY!

async function extractKpis(transcript: string, currentDraft: ExtractedKpis): Promise<{
  patches: ExtractedKpis
  ambiguities: string[]
}> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT)

  const systemPrompt = `Tu es un extracteur de KPI immobilier. Analyse la transcription et renvoie UNIQUEMENT un JSON valide.
KPI disponibles: contacts_totaux, estimations_realisees, mandats_signes, mandats_exclusifs, acheteurs_chauds, acheteurs_sortis_visite, nombre_visites, offres_recues, compromis_signes, actes_signes, chiffre_affaires.
Format de sortie: { "patches": { "kpi_name": { "value": <int>=0, "confidence": <float 0-1>, "source": "llm_extraction" } }, "ambiguities": [] }
Si un KPI est ambigu ou non mentionné, ne pas l'inclure dans patches.`

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 256,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Transcription: "${transcript}"\nDraft actuel: ${JSON.stringify(currentDraft)}` },
        ],
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const data = await res.json()
    const raw = data?.choices?.[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return { patches: parsed.patches ?? {}, ambiguities: parsed.ambiguities ?? [] }
  } catch (err: unknown) {
    clearTimeout(timeout)
    if (err instanceof Error && err.name === 'AbortError') throw new Error('LLM_TIMEOUT')
    throw err
  }
}

async function buildCoachReply(params: {
  persona: string
  clarificationTargets: KpiField[]
  serverStep: string
  lastTranscript: string
}): Promise<string> {
  const tone = PERSONA_COACHING_TONE[params.persona as keyof typeof PERSONA_COACHING_TONE] ?? PERSONA_COACHING_TONE.kind_coach
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT)

  const systemPrompt = `Tu es un coach immobilier conversationnel. TON: ${tone}
Règles: phrases courtes, UNE seule question max, jamais de vocabulaire formulaire, max 3 lignes.
Réponds UNIQUEMENT: { "coach_text": "..." }`

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 128,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Étape: ${params.serverStep}. À clarifier: ${params.clarificationTargets.join(', ')}. Dernier message utilisateur: "${params.lastTranscript}"` },
        ],
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const data = await res.json()
    const raw = data?.choices?.[0]?.message?.content ?? '{"coach_text":"Je t\'écoute."}'
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return parsed.coach_text ?? "Dis-moi en plus."
  } catch {
    clearTimeout(timeout)
    return "Je t'écoute, continue."
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { allowed } = checkRateLimit(`coach-turn:${auth.user.id}`, 30, 60_000)
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body = await request.json()
  const { session_id, transcript_final, channel, client_turn_id } = body

  if (!session_id || !transcript_final || !client_turn_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  // Vérifier que la session appartient à l'utilisateur
  const { data: session } = await supabase
    .from('coach_sessions')
    .select('*, coach_draft_states(*)')
    .eq('id', session_id)
    .eq('user_id', auth.user.id)
    .eq('status', 'active')
    .single()

  if (!session) return NextResponse.json({ error_code: 'SESSION_NOT_FOUND', recoverable: false }, { status: 404 })

  // Idempotence : vérifier si client_turn_id déjà traité
  const { data: existingUserMsg } = await supabase
    .from('coach_messages')
    .select('id')
    .eq('session_id', session_id)
    .eq('client_turn_id', client_turn_id)
    .eq('role', 'user')
    .single()

  if (existingUserMsg) {
    // Retrouver la réponse coach associée
    const { data: existingCoachMsg } = await supabase
      .from('coach_messages')
      .select('coach_text')
      .eq('session_id', session_id)
      .eq('role', 'coach')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      session_id, client_turn_id,
      ui_state: 'speaking', server_step: session.current_step,
      coach_text: existingCoachMsg?.coach_text ?? "Je t'écoute.",
      draft_status: { confirmed_fields: 0, missing_priority: [], uncertain_fields: [], can_confirm: false },
    })
  }

  const currentDraft: ExtractedKpis = session.coach_draft_states?.extracted_kpis ?? {}
  const relanceCount: number = session.coach_draft_states?.relance_count ?? 0

  // Extraction KPI
  let patches: ExtractedKpis = {}
  try {
    const extracted = await extractKpis(transcript_final, currentDraft)
    patches = extracted.patches
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'LLM_TIMEOUT') {
      return NextResponse.json({ error_code: 'LLM_TIMEOUT', recoverable: true }, { status: 502 })
    }
    return NextResponse.json({ error_code: 'LLM_TIMEOUT', recoverable: true }, { status: 502 })
  }

  // Valider les patches
  const validPatches: ExtractedKpis = {}
  for (const [field, entry] of Object.entries(patches)) {
    try {
      validateKpiPatch(entry as any)
      validPatches[field as KpiField] = entry as any
    } catch { /* rejeter silencieusement les entrées invalides */ }
  }

  // Merger dans le draft
  const updatedDraft = { ...currentDraft, ...validPatches }

  // Mettre à jour le draft en DB
  const { error: draftErr } = await supabase
    .from('coach_draft_states')
    .update({
      extracted_kpis: updatedDraft,
      last_transcript: transcript_final,
      relance_count: relanceCount + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', session_id)

  if (draftErr) {
    // Ne pas écrire dans coach_messages — log technique uniquement
    console.error('[coach/turn] draft patch failed:', draftErr)
    return NextResponse.json({ error_code: 'DRAFT_PATCH_FAILED', recoverable: true }, { status: 500 })
  }

  // Logger message utilisateur
  await supabase.from('coach_messages').insert({
    session_id, client_turn_id, role: 'user', channel,
    transcript_text: transcript_final, turn_status: 'ok',
  })

  // Décision moteur
  const decision = computeNextStep(updatedDraft, relanceCount + 1)
  const persona = isValidPersona(session.persona_used) ? session.persona_used : DEFAULT_PERSONA

  // Réponse coach
  const coach_text = await buildCoachReply({
    persona,
    clarificationTargets: decision.clarification_targets,
    serverStep: decision.next_step,
    lastTranscript: transcript_final,
  })

  // Logger message coach
  await supabase.from('coach_messages').insert({
    session_id, role: 'coach', channel: 'voice',
    coach_text, turn_status: 'ok',
  })

  // Mettre à jour current_step en session
  await supabase.from('coach_sessions').update({ current_step: decision.next_step }).eq('id', session_id)

  const draft_status = {
    confirmed_fields: Object.values(updatedDraft).filter(e => e.status === 'confirmed').length,
    missing_priority: decision.clarification_targets,
    uncertain_fields: [] as KpiField[],
    can_confirm: decision.can_confirm,
  }

  return NextResponse.json({
    session_id, client_turn_id,
    ui_state: decision.can_confirm ? 'confirming' : 'speaking',
    server_step: decision.next_step,
    coach_text,
    draft_status,
  })
}
