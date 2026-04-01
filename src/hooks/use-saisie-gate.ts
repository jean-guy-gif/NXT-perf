"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";

export type GateType = "monday" | null;

export interface SaisieGateState {
  gateRequired: GateType;
  isLoading: boolean;
  dismissGate: () => void;
  markSaisieDone: () => Promise<void>;
}

/** Returns the Monday of the current week as YYYY-MM-DD */
function getCurrentMonday(): string {
  const d = new Date();
  const day = d.getDay() || 7; // Sunday = 7
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().split("T")[0];
}

function isTodayMonday(): boolean {
  return new Date().getDay() === 1;
}

export function useSaisieGate(): SaisieGateState {
  const [gateRequired, setGateRequired] = useState<GateType>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isDemo = useAppStore((s) => s.isDemo);
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);

  const check = useCallback(async () => {
    // Pas de gate en mode démo
    if (isDemo || !user?.id) {
      setIsLoading(false);
      return;
    }

    // Seuls conseiller et manager voient le gate
    const role = user.mainRole;
    if (role !== "conseiller" && role !== "manager") {
      setIsLoading(false);
      return;
    }

    // Gate uniquement le lundi
    if (!isTodayMonday()) {
      setIsLoading(false);
      return;
    }

    const thisMonday = getCurrentMonday();

    // Vérifier le flag last_voice_saisie_date sur le profil
    const lastDate = profile?.last_voice_saisie_date ?? null;
    if (lastDate === thisMonday) {
      // Déjà vu cette semaine
      setIsLoading(false);
      return;
    }

    // Le gate doit s'afficher
    setGateRequired("monday");
    setIsLoading(false);
  }, [isDemo, user?.id, user?.mainRole, profile?.last_voice_saisie_date]);

  useEffect(() => {
    check();
  }, [check]);

  const dismissGate = useCallback(() => {
    setGateRequired(null);
    // Persister en Supabase pour ne pas réafficher cette semaine
    if (user?.id) {
      const supabase = createClient();
      supabase
        .from("profiles")
        .update({ last_voice_saisie_date: getCurrentMonday() })
        .eq("id", user.id)
        .then();
    }
  }, [user?.id]);

  const markSaisieDone = useCallback(async () => {
    setGateRequired(null);
    if (!user?.id) return;
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ last_voice_saisie_date: getCurrentMonday() })
      .eq("id", user.id);
  }, [user?.id]);

  return { gateRequired, isLoading, dismissGate, markSaisieDone };
}
