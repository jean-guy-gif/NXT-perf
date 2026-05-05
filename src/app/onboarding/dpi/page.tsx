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
    window.location.href = "/onboarding/statut";
  };

  // Skip = aucun flag marqué, simple redirection
  const handleSkip = () => {
    window.location.href = "/onboarding/statut";
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
            <button
              type="button"
              onClick={handleComplete}
              disabled={completing}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Terminer et continuer
            </button>
            <a
              href="/dpi/questionnaire"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" /> Nouvel onglet
            </a>
          </div>
        </div>
        <iframe
          src={dpiUrl}
          className="w-full flex-1 border-0"
          style={{ minHeight: "calc(100vh - 52px)" }}
          sandbox="allow-same-origin allow-scripts allow-forms"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* ═══ HEADER ═══ */}
        <header className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <BarChart3 className="h-3.5 w-3.5" />
            Diagnostic
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Votre Diagnostic de Performance, {firstName}
          </h1>
          <p className="mt-3 text-muted-foreground">
            3 minutes pour identifier vos axes de progression et personnaliser votre
            cockpit.
          </p>
        </header>

        {/* ═══ ENCART CONVICTION + CTA (R8/R9) ═══ */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
          <p className="mb-6 text-sm leading-relaxed text-foreground md:text-base">
            Le DPI analyse votre profil commercial et identifie vos points forts et vos
            axes d&apos;amélioration.
          </p>
          <button
            type="button"
            onClick={() => setShowDpi(true)}
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          >
            Commencer mon diagnostic
            <ArrowRight className="h-5 w-5" />
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            3 minutes — sans engagement
          </p>
        </div>

        {/* ═══ SKIP ═══ */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={handleSkip}
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Passer cette étape
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
