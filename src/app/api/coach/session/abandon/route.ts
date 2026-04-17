// src/app/api/coach/session/abandon/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { session_id } = await request.json()
  if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  const { data: session } = await supabase
    .from('coach_sessions').select('status')
    .eq('id', session_id).eq('user_id', auth.user.id).single()

  if (!session) return NextResponse.json({ error_code: 'SESSION_NOT_FOUND', recoverable: false }, { status: 404 })

  // No-op si déjà terminée
  if (['saved', 'closed'].includes(session.status)) {
    return NextResponse.json({ session_id, status: session.status })
  }

  await supabase.from('coach_sessions').update({
    status: 'abandoned', ended_at: new Date().toISOString(),
  }).eq('id', session_id)

  return NextResponse.json({ session_id, status: 'abandoned' })
}
