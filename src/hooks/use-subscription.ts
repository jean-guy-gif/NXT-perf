"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";

export type SubscriptionPlan = "free" | "trial" | "solo" | "team" | "agency";

const LOCKED_FEATURES = new Set([
  "resultats",
  "performance",
  "comparaison",
  "formation",
  "objectifs",
  "saisie",
  "export",
  "classement",
]);

export interface SubscriptionState {
  plan: SubscriptionPlan;
  isPremium: boolean;
  isTrial: boolean;
  trialDaysLeft: number | null;
  canAccess: (feature: string) => boolean;
  isLoading: boolean;
}

export function useSubscription(): SubscriptionState {
  const [plan, setPlan] = useState<SubscriptionPlan>("free");
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isDemo = useAppStore((s) => s.isDemo);
  const user = useAppStore((s) => s.user);

  useEffect(() => {
    if (isDemo) {
      // Demo mode: trial plan (no padlocks in demo)
      setPlan("trial");
      setTrialEndsAt(new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString());
      setIsLoading(false);
      return;
    }

    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan, trial_ends_at")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setPlan((data.plan as SubscriptionPlan) || "free");
        setTrialEndsAt(data.trial_ends_at);
      }
      setIsLoading(false);
    };

    load();
  }, [isDemo, user?.id]);

  const isTrial = plan === "trial";
  const trialActive = isTrial && trialEndsAt && new Date(trialEndsAt) > new Date();
  const isPremium = plan === "solo" || plan === "team" || plan === "agency" || !!trialActive;

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60_000)))
    : null;

  const canAccess = (feature: string): boolean => {
    if (isPremium) return true;
    return !LOCKED_FEATURES.has(feature);
  };

  return { plan, isPremium, isTrial, trialDaysLeft, canAccess, isLoading };
}
