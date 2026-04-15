// src/lib/coach-context.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export async function loadUserCoachContext(supabase: SupabaseClient, userId: string) {
  const [profileRes, resultsRes, prescriptionsRes] = await Promise.all([
    supabase.from('profiles').select('coach_persona, coach_onboarded, coach_persona_set_at').eq('id', userId).single(),
    supabase.from('period_results').select('*').eq('user_id', userId).order('week_start', { ascending: false }).limit(4),
    supabase.from('coach_prescriptions').select('*').eq('user_id', userId).order('prescribed_at', { ascending: false }).limit(5),
  ])
  return {
    profile: profileRes.data,
    recentResults: resultsRes.data ?? [],
    prescriptionHistory: prescriptionsRes.data ?? [],
  }
}
