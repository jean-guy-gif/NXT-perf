"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";

export type SubscriptionPlan = "free" | "solo" | "team" | "agency";

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
  canAccess: (feature: string) => boolean;
  isLoading: boolean;
}

export function useSubscription(): SubscriptionState {
  const [plan, setPlan] = useState<SubscriptionPlan>("free");
  const [isLoading, setIsLoading] = useState(true);
  const isDemo = useAppStore((s) => s.isDemo);
  const user = useAppStore((s) => s.user);

  useEffect(() => {
    if (isDemo) {
      // Demo mode: free plan to show padlocks
      setPlan("free");
      setIsLoading(false);
      return;
    }

    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("user_id", user.id)
        .single();

      setPlan((data?.plan as SubscriptionPlan) || "free");
      setIsLoading(false);
    };

    load();
  }, [isDemo, user?.id]);

  const isPremium = plan !== "free";

  const canAccess = (feature: string): boolean => {
    if (isPremium) return true;
    return !LOCKED_FEATURES.has(feature);
  };

  return { plan, isPremium, canAccess, isLoading };
}
