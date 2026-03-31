"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";

export type GateType = "weekly" | "monthly" | null;

export interface SaisieGateState {
  gateRequired: GateType;
  isLoading: boolean;
  dismissGate: () => void;
  refetch: () => void;
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function getMonthStart(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString().split("T")[0];
}

export function useSaisieGate(): SaisieGateState {
  const [gateRequired, setGateRequired] = useState<GateType>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isDemo = useAppStore((s) => s.isDemo);
  const user = useAppStore((s) => s.user);

  const check = async () => {
    // Pas de gate en mode démo
    if (isDemo || !user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const now = new Date();
    const weekStart = getWeekStart(now);
    const monthStart = getMonthStart(now);

    // Vérifier saisie mensuelle (priorité haute)
    const { data: monthlyData } = await supabase
      .from("period_results")
      .select("id")
      .eq("user_id", user.id)
      .gte("period_start", monthStart)
      .limit(1);

    if (!monthlyData || monthlyData.length === 0) {
      setGateRequired("monthly");
      setIsLoading(false);
      return;
    }

    // Vérifier saisie hebdomadaire
    const { data: weeklyData } = await supabase
      .from("period_results")
      .select("id")
      .eq("user_id", user.id)
      .gte("period_start", weekStart)
      .limit(1);

    if (!weeklyData || weeklyData.length === 0) {
      setGateRequired("weekly");
    } else {
      setGateRequired(null);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    check();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isDemo]);

  const dismissGate = () => setGateRequired(null);

  return { gateRequired, isLoading, dismissGate, refetch: check };
}
