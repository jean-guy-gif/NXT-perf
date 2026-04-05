"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Mail, Users, ArrowRight, UserPlus, BarChart3 } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingEquipePage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const isDemo = useAppStore((s) => s.isDemo);

  const [teamCode, setTeamCode] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [copied, setCopied] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Redirect if demo or not manager
  useEffect(() => {
    if (isDemo) { router.replace("/dashboard"); return; }
    if (profile?.role !== "manager") { router.replace("/dashboard"); return; }
  }, [isDemo, profile?.role, router]);

  // Load team code
  useEffect(() => {
    if (isDemo || !user?.id) return;
    const supabase = createClient();

    supabase.from("teams").select("id, name, code_equipe").eq("manager_id", user.id).single()
      .then(({ data, error }) => {
        if (!error && data) {
          setTeamCode(data.code_equipe);
          setTeamName(data.name);
        }
      });
  }, [user?.id, isDemo]);

  const handleCopy = () => {
    if (!teamCode) return;
    navigator.clipboard.writeText(teamCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmail = () => {
    if (!teamCode) return;
    const subject = encodeURIComponent("Rejoignez mon équipe sur NXT Performance");
    const body = encodeURIComponent(
      `Bonjour,\n\nJe vous invite à rejoindre mon équipe sur NXT Performance.\n\nUtilisez ce code lors de votre inscription : ${teamCode}\n\nInscription : https://nxt-perf.vercel.app/register\n\nÀ bientôt !`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleComplete = async () => {
    setCompleting(true);
    if (!isDemo && user?.id) {
      const supabase = createClient();
      await supabase.from("profiles").update({ onboarding_team_completed: true }).eq("id", user.id);
    }
    window.location.href = "/dashboard";
  };

  const firstName = user?.firstName || "Manager";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Users className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Invitez votre équipe, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Partagez ce code à vos conseillers pour qu'ils vous rejoignent
          </p>
        </div>

        {/* Code card */}
        {teamCode ? (
          <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 text-center space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Code équipe{teamName ? ` — ${teamName}` : ""}
            </p>
            <p className="text-3xl font-mono font-bold text-foreground tracking-widest">
              {teamCode}
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copié !" : "Copier le code"}
              </button>
              <button
                type="button"
                onClick={handleEmail}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Mail className="h-4 w-4" />
                Partager par email
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Votre code ��quipe sera disponible dans Paramètres &gt; Mon Équipe
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
              { icon: UserPlus, step: "1", text: "Vos conseillers s'inscrivent sur nxt-perf.vercel.app" },
              { icon: Copy, step: "2", text: "Ils entrent votre code lors de l'inscription" },
              { icon: BarChart3, step: "3", text: "Vous voyez leurs résultats dans votre cockpit" },
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
            Accéder à mon dashboard
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
