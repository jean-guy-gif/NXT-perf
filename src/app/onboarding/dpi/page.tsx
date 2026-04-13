"use client";

import { useState, useEffect } from "react";
import { BarChart3, ArrowRight, ExternalLink } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingDpiPage() {
  const user = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);
  const [showDpi, setShowDpi] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Get email from Supabase session (not from store — fresh)
  useEffect(() => {
    if (isDemo) return;
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.email) setUserEmail(session.user.email);
      }).catch(() => {});
    } catch {
      // Supabase not available — continue without email
    }
  }, [isDemo]);

  // Listen for DPI completion from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "dpi-complete") {
        handleComplete();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, user?.id]);

  // Seul chemin qui marque completed — l'utilisateur a réellement fait le DPI
  const handleComplete = async () => {
    setCompleting(true);
    try {
      if (!isDemo && user?.id) {
        const supabase = createClient();
        await supabase.from("profiles").update({
          onboarding_dpi_completed: true,
          last_dpi_date: new Date().toISOString().split("T")[0],
        }).eq("id", user.id);
      }
    } catch {
      // Continue even if Supabase fails
    }
    window.location.href = "/onboarding/gps";
  };

  // Skip = aucun flag marqué, simple redirection
  const handleSkip = () => {
    window.location.href = "/onboarding/gps";
  };

  const firstName = user?.firstName || "Conseiller";

  // DPI inline view (iframe with email pre-filled)
  if (showDpi) {
    const dpiUrl = userEmail
      ? `/dpi/questionnaire?email=${encodeURIComponent(userEmail)}&onboarding=true`
      : "/dpi/questionnaire?onboarding=true";

    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h1 className="text-sm font-semibold text-foreground">Diagnostic de Performance</h1>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleComplete}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              Terminer et continuer
            </button>
            <a href="/dpi/questionnaire" target="_blank" rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> Nouvel onglet
            </a>
          </div>
        </div>
        <iframe
          src={dpiUrl}
          className="flex-1 w-full border-0"
          style={{ minHeight: "calc(100vh - 52px)" }}
          sandbox="allow-same-origin allow-scripts allow-forms"
        />
      </div>
    );
  }

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
            onClick={() => setShowDpi(true)}
            className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Commencer mon diagnostic
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleSkip}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            Passer cette étape
          </button>
        </div>
      </div>
    </div>
  );
}
