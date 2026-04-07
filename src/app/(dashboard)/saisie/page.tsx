"use client";

import { useRouter } from "next/navigation";
import { WeeklyGate } from "@/components/saisie/weekly-gate";
import { useSupabaseResults } from "@/hooks/use-supabase-results";
import { useWeeklyGate } from "@/hooks/use-weekly-gate";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";
import { checkAndAwardBadges } from "@/lib/badge-service";
import { useBadgeStore } from "@/stores/badge-store";

export default function SaisiePage() {
  const router = useRouter();
  const { saveResult } = useSupabaseResults();
  const { context, markSaisieDone } = useWeeklyGate();
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const isDemo = useAppStore((s) => s.isDemo);
  const results = useAppStore((s) => s.results);

  const handleDismiss = () => {
    router.push("/dashboard");
  };

  const handleSaisieDone = async () => {
    await markSaisieDone();

    if (!isDemo && user?.id) {
      try {
        const supabase = createClient();

        // Notify manager
        if (user.managerId) {
          await supabase.from("notifications").insert({
            user_id: user.managerId,
            type: "saisie_done",
            message: `${user.firstName} a validé sa saisie de la semaine`,
          });
        }

        // Check and award badges based on latest results
        const latestResult = results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
        if (latestResult) {
          const newBadges = await checkAndAwardBadges(
            supabase,
            user.id,
            { avatar_url: profile?.avatar_url, agency_logo_url: profile?.agency_logo_url, coach_voice: profile?.coach_voice },
            { actesSignes: latestResult.ventes.actesSignes, chiffreAffaires: latestResult.ventes.chiffreAffaires },
            { mandatsSignes: latestResult.vendeurs.mandatsSignes },
            { contactsEntrants: latestResult.prospection.contactsEntrants },
          );
          if (newBadges.length > 0) {
            useBadgeStore.getState().queueCelebrations(newBadges);
          }
        }
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
