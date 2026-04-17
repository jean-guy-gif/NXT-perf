import type { SupabaseClient } from "@supabase/supabase-js";
import type { BadgeKey } from "./badges";

export interface DbBadge {
  id: string;
  user_id: string;
  badge_key: string;
  earned_at: string;
}

/** Award a badge if not already earned. Returns true if newly awarded. */
export async function awardBadgeIfEarned(
  supabase: SupabaseClient,
  userId: string,
  badgeKey: BadgeKey,
): Promise<boolean> {
  const { data: existing } = await supabase
    .from("badges")
    .select("id")
    .eq("user_id", userId)
    .eq("badge_key", badgeKey)
    .single();

  if (existing) return false;

  const { error } = await supabase
    .from("badges")
    .insert({ user_id: userId, badge_key: badgeKey });

  return !error;
}

/** Check all conditions and award badges after a saisie. Returns newly awarded badge keys. */
export async function checkAndAwardBadges(
  supabase: SupabaseClient,
  userId: string,
  profile: { avatar_url?: string | null; agency_logo_url?: string | null; coach_voice?: string | null },
  latestVentes: { actesSignes: number; chiffreAffaires: number },
  latestVendeurs: { mandatsSignes: number },
  latestProspection: { contactsTotaux: number },
): Promise<BadgeKey[]> {
  const newBadges: BadgeKey[] = [];

  // premier_pas: first saisie
  if (await awardBadgeIfEarned(supabase, userId, "premier_pas")) newBadges.push("premier_pas");

  // visage_reussite
  if (profile.avatar_url && await awardBadgeIfEarned(supabase, userId, "visage_reussite")) newBadges.push("visage_reussite");

  // fier_agence
  if (profile.agency_logo_url && await awardBadgeIfEarned(supabase, userId, "fier_agence")) newBadges.push("fier_agence");

  // ma_voix
  if (profile.coach_voice && await awardBadgeIfEarned(supabase, userId, "ma_voix")) newBadges.push("ma_voix");

  // hat_trick: 3 actes in a week
  if (latestVentes.actesSignes >= 3 && await awardBadgeIfEarned(supabase, userId, "hat_trick")) newBadges.push("hat_trick");

  // sniper: taux transformation > 30%
  if (latestVendeurs.mandatsSignes > 0 && latestProspection.contactsTotaux > 0) {
    const taux = latestVendeurs.mandatsSignes / latestProspection.contactsTotaux;
    if (taux > 0.3 && await awardBadgeIfEarned(supabase, userId, "sniper")) newBadges.push("sniper");
  }

  return newBadges;
}
