"use client";

import { WeeklyGate } from "@/components/saisie/weekly-gate";
import { useSupabaseResults } from "@/hooks/use-supabase-results";
import type { GateContext } from "@/lib/weekly-gate";

interface WeeklyGateWrapperProps {
  context: GateContext;
  onDismiss: () => void;
  onSaisieDone: () => void;
}

export function WeeklyGateWrapper({ context, onDismiss, onSaisieDone }: WeeklyGateWrapperProps) {
  const { saveResult } = useSupabaseResults();

  return (
    <WeeklyGate
      onDismiss={onDismiss}
      onSaisieDone={onSaisieDone}
      saveResult={saveResult}
      context={context}
    />
  );
}
