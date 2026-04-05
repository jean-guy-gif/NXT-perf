"use client";

import { useRouter } from "next/navigation";
import { WeeklyGate } from "@/components/saisie/weekly-gate";
import { useSupabaseResults } from "@/hooks/use-supabase-results";
import { useWeeklyGate } from "@/hooks/use-weekly-gate";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";

export default function SaisiePage() {
  const router = useRouter();
  const { saveResult } = useSupabaseResults();
  const { context, markSaisieDone } = useWeeklyGate();
  const user = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);

  const handleDismiss = () => {
    router.push("/dashboard");
  };

  const handleSaisieDone = async () => {
    await markSaisieDone();

    // Notify manager that saisie is done
    if (!isDemo && user?.managerId) {
      try {
        const supabase = createClient();
        await supabase.from("notifications").insert({
          user_id: user.managerId,
          type: "saisie_done",
          message: `${user.firstName} a validé sa saisie de la semaine`,
        });
      } catch { /* best-effort */ }
    }

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
