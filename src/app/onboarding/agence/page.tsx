"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Mail, Building2, ArrowRight, UserPlus, Users } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingAgencePage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const isDemo = useAppStore((s) => s.isDemo);

  const [codeAgence, setCodeAgence] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [managers, setManagers] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  // Redirect if demo or not directeur
  useEffect(() => {
    if (isDemo) { router.replace("/dashboard"); return; }
    if (profile?.role !== "directeur") { router.replace("/dashboard"); return; }
  }, [isDemo, profile?.role, router]);

  // Load agency data
  useEffect(() => {
    if (isDemo || !profile?.org_id) return;
    const supabase = createClient();

    supabase.from("organizations").select("name, code_agence, invite_code").eq("id", profile.org_id).single()
      .then(({ data, error }) => {
        if (!error && data) {
          setOrgName(data.name);
          setCodeAgence(data.code_agence);
          setInviteCode(data.invite_code);
        }
      });

    // Load managers already in this org
    supabase.from("profiles").select("id, first_name, last_name").eq("org_id", profile.org_id).eq("role", "manager")
      .then(({ data, error }) => {
        if (!error && data) setManagers(data);
      });
  }, [isDemo, profile?.org_id]);

  const handleCopy = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleEmail = () => {
    const code = codeAgence || inviteCode;
    if (!code) return;
    const subject = encodeURIComponent("Rejoignez mon agence sur NXT Performance");
    const body = encodeURIComponent(
      `Bonjour,\n\nJe vous invite à rejoindre notre agence "${orgName}" sur NXT Performance.\n\nUtilisez ce code lors de votre inscription : ${code}\n\nInscription : https://nxt-perf.vercel.app/register\n\nÀ bientôt !`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleComplete = async () => {
    setCompleting(true);
    if (!isDemo && user?.id) {
      const supabase = createClient();
      await supabase.from("profiles").update({ onboarding_team_completed: true }).eq("id", user.id);
    }
    window.location.href = "/conseiller/diagnostic";
  };

  const firstName = user?.firstName || "Directeur";
  const displayCode = codeAgence || inviteCode;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Votre agence est prête, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Partagez ce code à vos managers pour qu'ils vous rejoignent
          </p>
        </div>

        {/* Code card */}
        {displayCode ? (
          <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 text-center space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Code agence{orgName ? ` — ${orgName}` : ""}
            </p>
            <p className="text-3xl font-mono font-bold text-foreground tracking-widest">
              {displayCode}
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => handleCopy(displayCode, "code")}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {copied === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied === "code" ? "Copié !" : "Copier le code"}
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
              Votre code agence sera disponible dans Paramètres &gt; Mon Agence
            </p>
          </div>
        )}

        {/* Managers list */}
        {managers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Managers rattachés ({managers.length})
            </p>
            <div className="space-y-1">
              {managers.map((m) => (
                <div key={m.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{m.first_name} {m.last_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">
            Comment ça marche
          </p>
          <div className="grid gap-3">
            {[
              { step: "1", text: "Vos managers s'inscrivent sur nxt-perf.vercel.app" },
              { step: "2", text: "Ils entrent votre code agence lors de l'inscription" },
              { step: "3", text: "Ils créent ensuite leurs équipes de conseillers" },
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
