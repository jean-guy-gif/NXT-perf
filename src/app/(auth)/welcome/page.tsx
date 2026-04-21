"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Users,
  UserCheck,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";

const profiles = [
  {
    profile: "INSTITUTION",
    icon: Building2,
    title: "Je crée une agence",
    desc: "Créez votre agence, invitez managers et conseillers",
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
    desc: "Rejoignez l'équipe de votre manager avec un code",
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

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
      return;
    }

    const checkSession = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.replace("/dashboard");
      }
    };
    checkSession();
  }, [isAuthenticated, router]);

  return (
    <div>
      {/* Logo */}
      <div className="flex justify-center">
        <img src="/logo-icon.svg" alt="NXT Perf" className="h-12 w-12" />
      </div>

      {/* Hero — template R15 adapté au container max-w-md */}
      <div className="mt-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Cockpit de performance immobilière
        </p>
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
          <span className="text-primary">Diagnostiquez</span> votre performance,
          puis <span className="text-primary">activez</span> le bon parcours.
        </h1>
        <p className="mt-6 text-base text-muted-foreground md:text-lg">
          Diagnostic gratuit en 2 minutes. Puis 1 mois d&apos;essai complet
          selon votre profil, sans carte bancaire.
        </p>
      </div>

      {/* Encart DPI — parcours recommandé (bg-primary/5) */}
      <div className="mt-10 rounded-xl border border-primary/30 bg-primary/5 p-6">
        <div className="flex justify-center">
          <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-500">
            Gratuit · 2 min
          </span>
        </div>
        <h2 className="mt-3 text-center text-lg font-bold text-foreground">
          Diagnostic de Performance Immobilière
        </h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-foreground md:text-base">
          Score sur 100, 6 axes, point de départ du Copilote NXT. Aucune donnée
          requise, aucun engagement.
        </p>
        <div className="mt-6 flex flex-col items-center">
          <button
            onClick={() => router.push("/dpi")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          >
            Démarrer mon diagnostic
            <ArrowRight className="h-5 w-5" />
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            Sans création de compte
          </p>
        </div>
      </div>

      {/* Séparateur — bifurcation vers le parcours alternatif */}
      <div className="my-8 flex items-center gap-4">
        <hr className="flex-1 border-border" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Ou créez votre compte — 1 mois d&apos;essai
        </p>
        <hr className="flex-1 border-border" />
      </div>

      {/* Cards profil */}
      <div className="space-y-3">
        {profiles.map((p) => (
          <button
            key={p.profile}
            onClick={() => router.push(`/register?profile=${p.profile}`)}
            className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-primary hover:bg-primary/5"
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

      {/* Footer nav */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:text-primary/80"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
