"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Users, UserCheck, GraduationCap, Target } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";

const profiles = [
  {
    profile: "INSTITUTION",
    icon: Building2,
    title: "Je crée une agence",
    desc: "Créez votre agence et invitez vos managers et conseillers",
  },
  {
    profile: "MANAGER",
    icon: Users,
    title: "Je suis Manager",
    desc: "Rejoignez une agence existante ou créez votre équipe",
  },
  {
    profile: "AGENT",
    icon: UserCheck,
    title: "Je suis Conseiller",
    desc: "Rejoignez l'équipe de votre manager avec un code d'invitation",
  },
  {
    profile: "COACH",
    icon: GraduationCap,
    title: "Je suis Coach",
    desc: "Accompagnez vos clients vers la performance",
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  // Redirect authenticated users (demo or Supabase) to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
      return;
    }

    // Check Supabase session — user may have a cookie but store isn't hydrated
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace("/dashboard");
      }
    };
    checkSession();
  }, [isAuthenticated, router]);

  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="mb-6 flex justify-center">
        <img src="/logo-icon.svg" alt="NXT Perf" className="h-14 w-14" />
      </div>
      <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
        Bienvenue sur NXT-Perf
      </h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        La plateforme de performance pour les professionnels de l&apos;immobilier
      </p>

      {/* DPI Block */}
      <div
        onClick={() => router.push("/dpi")}
        className="mb-6 cursor-pointer rounded-2xl p-6 text-center text-white"
        style={{
          background: "linear-gradient(135deg, #3375FF, #6B47FF, #A055FF, #3375FF)",
          backgroundSize: "300% 300%",
          animation: "dpiGradient 3s ease infinite, dpiGlow 2s ease-in-out infinite",
        }}
      >
        <span className="inline-block rounded-full bg-[#22c55e] px-4 py-1 text-sm font-bold uppercase text-white">
          100% GRATUIT
        </span>
        <h2 className="mt-3 text-xl font-bold">Diagnostic de Performance Immobilière</h2>
        <p className="mt-2 text-sm text-white/80">
          Évaluez votre niveau, découvrez votre potentiel de croissance et comparez-vous aux meilleurs
        </p>
        <button className="mt-4 rounded-full bg-white/20 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/30">
          Démarrer mon diagnostic →
        </button>
      </div>
      <style>{`
        @keyframes dpiGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes dpiGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(51,117,255,0.3), 0 4px 15px rgba(0,0,0,0.1); }
          50% { box-shadow: 0 0 30px rgba(160,85,255,0.5), 0 4px 20px rgba(0,0,0,0.15); }
        }
      `}</style>

      <div className="space-y-3">
        {profiles.map((p) => (
          <button
            key={p.profile}
            onClick={() => router.push(`/register?profile=${p.profile}`)}
            className="flex w-full items-center gap-4 rounded-xl border border-input bg-background p-4 text-left transition-all hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <p.icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{p.title}</p>
              <p className="text-sm text-muted-foreground">{p.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary/80">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
