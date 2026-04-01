"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";
import { getWeeklyGateState, getMondayOfWeek } from "@/lib/weekly-gate";
import type { GateContext, WeeklySubmissionStatus } from "@/lib/weekly-gate";

export interface WeeklyGateHookState {
  /** Should the fullscreen gate be shown? */
  showGate: boolean;
  /** Context for the gate display */
  context: GateContext;
  /** Current submission status */
  submissionStatus: WeeklySubmissionStatus;
  /** Should the resume button be shown in the dashboard? */
  showResumeButton: boolean;
  /** Still loading initial state */
  isLoading: boolean;
  /** Dismiss the gate (user clicks "Passer pour l'instant") */
  dismissGate: () => void;
  /** Mark the weekly entry as done (after saving) */
  markSaisieDone: () => Promise<void>;
  /** Reopen the gate (user clicks "Compléter ma saisie") */
  reopenGate: () => void;
}

function getDevGateParam(): string | null {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("gate");
}

function isDevForced(): boolean {
  const param = getDevGateParam();
  return param === "1" || param === "demo" || param === "friday" || param === "catchup";
}

export function useWeeklyGate(): WeeklyGateHookState {
  const [showGate, setShowGate] = useState(false);
  const [context, setContext] = useState<GateContext>("none");
  const [submissionStatus, setSubmissionStatus] = useState<WeeklySubmissionStatus>("done");
  const [showResumeButton, setShowResumeButton] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isDemo = useAppStore((s) => s.isDemo);
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);

  const compute = useCallback(() => {
    if (!user?.id) return; // wait for hydration

    // DEV: ?gate=demo|friday|catchup forces a specific context
    const devParam = getDevGateParam();
    if (devParam && ["demo", "friday", "catchup"].includes(devParam)) {
      const ctxMap: Record<string, GateContext> = { demo: "demo", friday: "friday_required", catchup: "monday_catchup" };
      setShowGate(true);
      setContext(ctxMap[devParam] ?? "friday_required");
      setSubmissionStatus(devParam === "catchup" ? "overdue" : "pending");
      setShowResumeButton(devParam !== "demo");
      setIsLoading(false);
      return;
    }

    const result = getWeeklyGateState({
      isDemo,
      isDevForced: isDevForced(),
      role: user.mainRole,
      lastWeeklySubmissionDate: profile?.last_voice_saisie_date ?? null,
    });

    setShowGate(result.showGate);
    setContext(result.context);
    setSubmissionStatus(result.submissionStatus);
    setShowResumeButton(result.showResumeButton);
    setIsLoading(false);
  }, [isDemo, user?.id, user?.mainRole, profile?.last_voice_saisie_date]);

  useEffect(() => {
    compute();
  }, [compute]);

  const dismissGate = useCallback(() => {
    setShowGate(false);
    // Persist to Supabase so the gate won't re-show this week
    if (user?.id && !isDemo) {
      const supabase = createClient();
      const thisMonday = getMondayOfWeek(new Date());
      supabase
        .from("profiles")
        .update({ last_voice_saisie_date: thisMonday })
        .eq("id", user.id)
        .then();
    }
  }, [user?.id, isDemo]);

  const markSaisieDone = useCallback(async () => {
    setShowGate(false);
    setSubmissionStatus("done");
    setShowResumeButton(false);
    if (!user?.id) return;
    const supabase = createClient();
    const thisMonday = getMondayOfWeek(new Date());
    await supabase
      .from("profiles")
      .update({ last_voice_saisie_date: thisMonday })
      .eq("id", user.id);
  }, [user?.id]);

  const reopenGate = useCallback(() => {
    setShowGate(true);
    // Keep the same context — the user is voluntarily reopening
  }, []);

  return {
    showGate,
    context,
    submissionStatus,
    showResumeButton,
    isLoading,
    dismissGate,
    markSaisieDone,
    reopenGate,
  };
}
