"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, HeartHandshake, ArrowRight } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingCoachPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const isDemo = useAppStore((s) => s.isDemo);

  const [coachCode, setCoachCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Redirect if demo or not coach
  useEffect(() => {
    if (isDemo) { router.replace("/dashboard"); return; }
    if (profile?.role !== "coach" && !profile?.available_roles?.includes("coach")) {
      router.replace("/dashboard");
    }
  }, [isDemo, profile?.role, profile?.available_roles, router]);

  // Load coach code
  useEffect(() => {
    if (isDemo || !user?.id) return;
    const supabase = createClient();
    supabase.from("profiles").select("coach_code").eq("id", user.id).single()
      .then(({ data, error }) => {
        if (!error && data?.coach_code) setCoachCode(data.coach_code);
      });
  }, [user?.id, isDemo]);

  const handleCopy = () => {
    if (!coachCode) return;
    navigator.clipboard.writeText(coachCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleComplete = async () => {
    setCompleting(true);
    if (!isDemo && user?.id) {
      const supabase = createClient();
      await supabase.from("profiles").update({ onboarding_team_completed: true }).eq("id", user.id);
    }
    window.location.href = "/coach/dashboard";
  };

  const firstName = user?.firstName || "Coach";

  const steps = [
    { step: "1", text: "Vos coachés se connectent à NXT Performance" },
    { step: "2", text: "Ils entrent votre code dans Paramètres > Coaching" },
    { step: "3", text: "Vous accédez à leurs résultats en temps réel" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* ═══ HEADER ═══ */}
        <header className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <HeartHandshake className="h-3.5 w-3.5" />
            Coaching
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Votre espace coach est prêt, {firstName}
          </h1>
          <p className="mt-3 text-muted-foreground">
            Partagez ce code à vos coachés pour qu&apos;ils vous ajoutent.
          </p>
        </header>

        {/* ═══ CODE COACH (encart primary R8) ═══ */}
        {coachCode ? (
          <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Votre code coach
            </p>
            <p className="text-3xl font-mono font-bold tabular-nums tracking-widest text-foreground">
              {coachCode}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="mx-auto flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copié !" : "Copier le code"}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Votre code coach sera disponible dans Paramètres &gt; Coaching
            </p>
          </div>
        )}

        {/* ═══ COMMENT ÇA MARCHE ═══ */}
        <div className="space-y-3">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Comment ça marche
          </p>
          <div className="grid gap-3">
            {steps.map((item) => (
              <div
                key={item.step}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {item.step}
                </div>
                <p className="text-sm text-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ CTA + SKIP ═══ */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleComplete}
            disabled={completing}
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Accéder à mon espace coach
            <ArrowRight className="h-5 w-5" />
          </button>
          <p className="text-xs text-muted-foreground">
            Vous pouvez inviter d&apos;autres coachés à tout moment depuis vos paramètres.
          </p>
          <button
            type="button"
            onClick={handleComplete}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Passer cette étape
          </button>
        </div>
      </div>
    </div>
  );
}
