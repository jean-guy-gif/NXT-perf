"use client";

import { useRouter } from "next/navigation";
import { WeeklyGate } from "@/components/saisie/weekly-gate";
import { useSupabaseResults } from "@/hooks/use-supabase-results";
import { useWeeklyGate } from "@/hooks/use-weekly-gate";

export default function SaisiePage() {
  const router = useRouter();
  const { saveResult } = useSupabaseResults();
  const { context, markSaisieDone } = useWeeklyGate();

  const handleDismiss = () => {
    router.push("/dashboard");
  };

  const handleSaisieDone = async () => {
    await markSaisieDone();
    router.push("/dashboard");
  };

  return (
    <WeeklyGate
      onDismiss={handleDismiss}
      onSaisieDone={handleSaisieDone}
      saveResult={saveResult}
      context={context !== "none" ? context : "friday_required"}
    />
  );
}
