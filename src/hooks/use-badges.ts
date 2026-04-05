"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/stores/app-store";
import { useSupabase } from "./use-supabase";
import type { DbBadge } from "@/lib/badge-service";
import type { BadgeKey } from "@/lib/badges";

export function useBadges() {
  const supabase = useSupabase();
  const isDemo = useAppStore((s) => s.isDemo);
  const user = useAppStore((s) => s.user);

  const [badges, setBadges] = useState<DbBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo || !user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("badges")
        .select("*")
        .eq("user_id", user!.id)
        .order("earned_at", { ascending: false });

      if (!cancelled) {
        if (!error && data) setBadges(data as DbBadge[]);
        setLoading(false);
      }
    }

    load();

    // Realtime subscription for new badges
    const channel = supabase
      .channel(`badges:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "badges", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setBadges((prev) => [payload.new as DbBadge, ...prev]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, isDemo, user?.id]);

  const hasBadge = useCallback(
    (key: BadgeKey) => badges.some((b) => b.badge_key === key),
    [badges],
  );

  return {
    earnedBadges: badges,
    totalEarned: badges.length,
    hasBadge,
    loading,
  };
}
