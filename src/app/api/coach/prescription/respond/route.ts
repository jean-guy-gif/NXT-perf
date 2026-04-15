// src/app/api/coach/prescription/respond/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { session_id, prescription_id, response } = await request.json()
  if (!session_id || !prescription_id || !response) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = await createClient()

  await supabase.from('coach_prescriptions').update({ user_response: response })
    .eq('id', prescription_id).eq('user_id', auth.user.id)

  const closing = response === 'accepted'
    ? "Super. Je te prépare ça. À la semaine prochaine !"
    : "Pas de souci. On continue comme ça. Belle semaine !"

  await supabase.from('coach_messages').insert({
    session_id, role: 'coach', channel: 'voice', coach_text: closing,
  })

  await supabase.from('coach_sessions').update({ current_step: 'closed', status: 'closed' }).eq('id', session_id)

  return NextResponse.json({ session_id, status: 'closed' })
}
