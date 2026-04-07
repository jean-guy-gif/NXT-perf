import type { SupabaseClient } from "@supabase/supabase-js";
import type { PeriodResults } from "@/types/results";
import type { UserCategory } from "@/types/user";
import { CATEGORY_OBJECTIVES } from "@/lib/constants";

// ── Badge definitions ───────────────────────────────────────────────────────

export interface PerformanceBadgeDef {
  key: string;
  emoji: string;
  name: string;
  description: string;
  check: (r: PeriodResults, obj: typeof CATEGORY_OBJECTIVES.confirme) => boolean;
}

export const PERFORMANCE_BADGES: PerformanceBadgeDef[] = [
  {
    key: "prospecteur", emoji: "\u{1F50D}", name: "Prospecteur",
    description: "Taux contacts \u2192 RDV sup\u00e9rieur \u00e0 l'objectif",
    check: (r, obj) => r.prospection.contactsEntrants >= obj.estimations,
  },
  {
    key: "roi_estimation", emoji: "\u{1F3E0}", name: "Roi de l'Estimation",
    description: "Estimations sup\u00e9rieures \u00e0 l'objectif",
    check: (r, obj) => r.vendeurs.estimationsRealisees >= obj.estimations,
  },
  {
    key: "maitre_exclusivite", emoji: "\u2B50", name: "Ma\u00eetre de l'Exclusivit\u00e9",
    description: "% exclusivit\u00e9 sup\u00e9rieur \u00e0 l'objectif",
    check: (r, obj) => {
      const total = r.vendeurs.mandats.length;
      if (total === 0) return false;
      const exclu = r.vendeurs.mandats.filter((m) => m.type === "exclusif").length;
      return (exclu / total) * 100 >= obj.exclusivite;
    },
  },
  {
    key: "visiteur_pro", emoji: "\u{1F441}\uFE0F", name: "Visiteur Pro",
    description: "Visites sup\u00e9rieures \u00e0 l'objectif",
    check: (r, obj) => r.acheteurs.nombreVisites >= obj.visites,
  },
  {
    key: "closing_master", emoji: "\u{1F91D}", name: "Closing Master",
    description: "Offres sup\u00e9rieures \u00e0 l'objectif",
    check: (r, obj) => r.acheteurs.offresRecues >= obj.offres,
  },
  {
    key: "finisher", emoji: "\u26A1", name: "Finisher",
    description: "Actes sup\u00e9rieurs \u00e0 l'objectif",
    check: (r, obj) => r.ventes.actesSignes >= obj.actes,
  },
  {
    key: "top_ca", emoji: "\u{1F4B0}", name: "Top CA",
    description: "CA mensuel sup\u00e9rieur \u00e0 l'objectif",
    check: (r, obj) => r.ventes.chiffreAffaires >= obj.ca,
  },
  {
    key: "regularite", emoji: "\u{1F4C8}", name: "R\u00e9gularit\u00e9",
    description: "Tous les objectifs atteints ce mois",
    check: (r, obj) =>
      r.vendeurs.estimationsRealisees >= obj.estimations &&
      r.vendeurs.mandatsSignes >= obj.mandats &&
      r.acheteurs.nombreVisites >= obj.visites &&
      r.acheteurs.offresRecues >= obj.offres &&
      r.ventes.actesSignes >= obj.actes,
  },
];

// ── Types ────────────────────────────────────────────────────────────────────

export type PerfBadgeLevel = "bronze" | "argent" | "or" | "diamant";

export interface DbPerformanceBadge {
  id: string;
  user_id: string;
  badge_key: string;
  level: PerfBadgeLevel;
  consecutive_months: number;
  last_awarded_month: string;
  is_active: boolean;
  updated_at: string;
}

export const LEVEL_LABELS: Record<PerfBadgeLevel, string> = {
  bronze: "Bronze", argent: "Argent", or: "Or", diamant: "Diamant",
};

export const LEVEL_EMOJI: Record<PerfBadgeLevel, string> = {
  bronze: "\u{1F949}", argent: "\u{1F948}", or: "\u{1F947}", diamant: "\u{1F48E}",
};

// ── Level calculation ────────────────────────────────────────────────────────

export function getLevel(months: number): PerfBadgeLevel | null {
  if (months >= 12) return "diamant";
  if (months >= 6) return "or";
  if (months >= 3) return "argent";
  if (months >= 1) return "bronze";
  return null;
}

// ── Main update function ─────────────────────────────────────────────────────

export async function updatePerformanceBadges(
  supabase: SupabaseClient,
  userId: string,
  latestResults: PeriodResults,
  category: UserCategory,
): Promise<{ gained: string[]; lost: string[]; upgraded: string[] }> {
  const obj = CATEGORY_OBJECTIVES[category];
  const currentMonth = new Date().toISOString().slice(0, 7) + "-01"; // YYYY-MM-01

  // Load existing badges
  const { data: existing } = await supabase
    .from("performance_badges")
    .select("*")
    .eq("user_id", userId);

  const existingMap = new Map<string, DbPerformanceBadge>();
  for (const b of (existing ?? []) as DbPerformanceBadge[]) {
    existingMap.set(b.badge_key, b);
  }

  const gained: string[] = [];
  const lost: string[] = [];
  const upgraded: string[] = [];

  for (const badge of PERFORMANCE_BADGES) {
    const isAchieved = badge.check(latestResults, obj);
    const prev = existingMap.get(badge.key);

    if (isAchieved) {
      if (prev) {
        // Already exists — check if same month already processed
        if (prev.last_awarded_month === currentMonth) continue;

        const newMonths = prev.consecutive_months + 1;
        const newLevel = getLevel(newMonths)!;
        const prevLevel = prev.level;

        await supabase.from("performance_badges").update({
          consecutive_months: newMonths,
          level: newLevel,
          last_awarded_month: currentMonth,
          is_active: true,
          updated_at: new Date().toISOString(),
        }).eq("id", prev.id);

        if (newLevel !== prevLevel) upgraded.push(badge.key);
        if (!prev.is_active) gained.push(badge.key);
      } else {
        // New badge
        await supabase.from("performance_badges").insert({
          user_id: userId,
          badge_key: badge.key,
          level: "bronze",
          consecutive_months: 1,
          last_awarded_month: currentMonth,
          is_active: true,
        });
        gained.push(badge.key);
      }
    } else if (prev && prev.is_active) {
      // Lost — decrement
      const newMonths = Math.max(0, prev.consecutive_months - 1);
      const newLevel = getLevel(newMonths);
      const isActive = newLevel !== null;

      await supabase.from("performance_badges").update({
        consecutive_months: newMonths,
        level: newLevel ?? "bronze",
        is_active: isActive,
        last_awarded_month: currentMonth,
        updated_at: new Date().toISOString(),
      }).eq("id", prev.id);

      if (!isActive) lost.push(badge.key);
    }
  }

  return { gained, lost, upgraded };
}
