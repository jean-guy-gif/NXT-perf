"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, ArrowRight } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingDpiPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);
  const [completing, setCompleting] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const handleComplete = async () => {
    setCompleting(true);
    if (!isDemo && user?.id) {
      const supabase = createClient();
      await supabase.from("profiles").update({
        onboarding_dpi_completed: true,
        last_dpi_date: new Date().toISOString().split("T")[0],
      }).eq("id", user.id);
    }
    window.location.href = "/onboarding/gps";
  };

  const handleSkip = () => {
    setSkipping(true);
    window.location.href = "/onboarding/gps";
  };

  const handleStartDpi = () => {
    // Store return URL and navigate to public DPI
    sessionStorage.setItem("dpi_return_url", "/onboarding/dpi");
    router.push("/dpi");
  };

  const firstName = user?.firstName || "Conseiller";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <BarChart3 className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Votre Diagnostic de Performance, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            3 minutes pour identifier vos axes de progression
          </p>
        </div>

        <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 text-center space-y-4">
          <p className="text-sm text-foreground leading-relaxed">
            Le DPI analyse votre profil commercial et identifie vos points forts
            et vos axes d'amélioration sur 8 dimensions clés.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="rounded-lg border border-border bg-card px-3 py-2">Prospection</div>
            <div className="rounded-lg border border-border bg-card px-3 py-2">Négociation</div>
            <div className="rounded-lg border border-border bg-card px-3 py-2">Suivi client</div>
            <div className="rounded-lg border border-border bg-card px-3 py-2">Organisation</div>
          </div>
          <button
            type="button"
            onClick={handleStartDpi}
            className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Commencer mon diagnostic
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleComplete}
            disabled={completing}
            className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <ArrowRight className="h-4 w-4" />
            Continuer sans DPI
          </button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={skipping}
            className="text-xs text-muted-foreground hover:text-muted-foreground/70 transition-colors"
          >
            Passer cette étape
          </button>
        </div>
      </div>
    </div>
  );
}
