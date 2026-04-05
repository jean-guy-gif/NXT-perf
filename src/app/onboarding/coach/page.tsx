"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, HeartHandshake, ArrowRight, UserPlus, Settings, BarChart3 } from "lucide-react";
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <HeartHandshake className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Votre espace coach est prêt, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Partagez ce code à vos coachés pour qu'ils vous ajoutent
          </p>
        </div>

        {/* Code card */}
        {coachCode ? (
          <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 text-center space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Votre code coach
            </p>
            <p className="text-3xl font-mono font-bold text-foreground tracking-widest">
              {coachCode}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 mx-auto rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copié !" : "Copier le code"}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Votre code coach sera disponible dans Paramètres &gt; Coaching
            </p>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
            Comment ça marche
          </p>
          <div className="grid gap-3">
            {[
              { icon: UserPlus, step: "1", text: "Vos coachés se connectent à NXT Performance" },
              { icon: Settings, step: "2", text: "Ils entrent votre code dans Paramètres > Coaching" },
              { icon: BarChart3, step: "3", text: "Vous accédez à leurs résultats en temps réel" },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {item.step}
                </div>
                <p className="text-sm text-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleComplete}
            disabled={completing}
            className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <ArrowRight className="h-4 w-4" />
            Accéder à mon espace coach
          </button>
          <button
            type="button"
            onClick={handleComplete}
            className="text-xs text-muted-foreground hover:text-muted-foreground/70 transition-colors"
          >
            Passer cette étape
          </button>
        </div>
      </div>
    </div>
  );
}
