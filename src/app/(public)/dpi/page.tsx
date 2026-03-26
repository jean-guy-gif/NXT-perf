"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target, ArrowRight, BarChart3, TrendingUp, Zap, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

// NOTE: Run this SQL on Supabase to add 'waitlist' status:
// ALTER TABLE public.dpi_results DROP CONSTRAINT dpi_results_status_check;
// ALTER TABLE public.dpi_results ADD CONSTRAINT dpi_results_status_check CHECK (status IN ('started', 'completed', 'pdf_downloaded', 'waitlist'));

const AUTHORIZED_EMAILS = [
  "jean-guy@start-academy.fr",
  "laurent@start-academy.fr",
  "sebastien@sebastientedesco.com",
];

export default function DPILandingPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [waitlist, setWaitlist] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return;

    setLoading(true);
    const trimmedEmail = email.trim().toLowerCase();
    const isAuthorized = AUTHORIZED_EMAILS.includes(trimmedEmail);

    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("dpi_results")
        .insert({ email: trimmedEmail, status: isAuthorized ? "started" : "waitlist" })
        .select("id")
        .single();

      if (insertError) {
        setError("Une erreur est survenue. Réessayez.");
        setLoading(false);
        return;
      }

      if (isAuthorized && data) {
        sessionStorage.setItem("dpi_id", data.id);
        sessionStorage.setItem("dpi_email", trimmedEmail);
        router.push("/dpi/questionnaire");
      } else {
        setWaitlist(true);
      }
    } catch {
      setError("Une erreur est survenue. Réessayez.");
      setLoading(false);
    }
  };

  // ── Coming Soon screen ──
  if (waitlist) {
    return (
      <div className="flex flex-col items-center">
        <div className="mb-6 flex items-center gap-2">
          <img src="/logo-icon.svg" alt="NXT Perf" className="h-10 w-10" />
          <span className="text-lg font-bold text-foreground">NXT Performance</span>
        </div>

        <div
          className="mb-8 w-full rounded-2xl p-8 text-center text-white"
          style={{
            background: "linear-gradient(135deg, #3375FF, #6B47FF, #A055FF, #3375FF)",
            backgroundSize: "300% 300%",
            animation: "dpiGradient 3s ease infinite, dpiGlow 2s ease-in-out infinite",
          }}
        >
          <div className="mb-4 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
              <Clock className="h-10 w-10 text-white" />
            </div>
          </div>
          <span className="inline-block rounded-full bg-[#f97316] px-4 py-1 text-sm font-bold uppercase text-white shadow-lg">
            PROCHAINEMENT
          </span>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
            Le DPI arrive bientôt !
          </h1>
          <p className="mt-3 text-sm text-white/80 sm:text-base">
            Votre intérêt a bien été enregistré. Nous vous préviendrons dès que le Diagnostic de Performance Immobilière sera disponible.
          </p>
        </div>

        <style>{`
          @keyframes dpiGradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes dpiGlow {
            0%, 100% { box-shadow: 0 0 20px rgba(51,117,255,0.3), 0 8px 30px rgba(0,0,0,0.1); }
            50% { box-shadow: 0 0 40px rgba(160,85,255,0.4), 0 8px 40px rgba(0,0,0,0.15); }
          }
        `}</style>

        <Link
          href="/welcome"
          className="flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-border bg-card font-medium text-foreground transition-colors hover:bg-muted"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  // ── Normal landing page ──
  return (
    <div className="flex flex-col items-center">
      {/* Logo */}
      <div className="mb-6 flex items-center gap-2">
        <img src="/logo-icon.svg" alt="NXT Perf" className="h-10 w-10" />
        <span className="text-lg font-bold text-foreground">NXT Performance</span>
      </div>

      {/* Hero block */}
      <div
        className="mb-8 w-full rounded-2xl p-8 text-center text-white"
        style={{
          background: "linear-gradient(135deg, #3375FF, #6B47FF, #A055FF, #3375FF)",
          backgroundSize: "300% 300%",
          animation: "dpiGradient 3s ease infinite, dpiGlow 2s ease-in-out infinite",
        }}
      >
        <div className="mb-4 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
            <Target className="h-10 w-10 text-white" />
          </div>
        </div>
        <span className="inline-block rounded-full bg-[#22c55e] px-4 py-1 text-sm font-bold uppercase text-white shadow-lg">
          100% GRATUIT
        </span>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          Diagnostic de Performance Immobilière
        </h1>
        <p className="mt-3 text-sm text-white/80 sm:text-base">
          Évaluez votre niveau, découvrez votre potentiel de croissance et comparez-vous aux meilleurs du marché
        </p>
      </div>

      <style>{`
        @keyframes dpiGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes dpiGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(51,117,255,0.3), 0 8px 30px rgba(0,0,0,0.1); }
          50% { box-shadow: 0 0 40px rgba(160,85,255,0.4), 0 8px 40px rgba(0,0,0,0.15); }
        }
      `}</style>

      {/* Value props */}
      <div className="mb-8 grid w-full grid-cols-3 gap-3">
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-4 text-center">
          <BarChart3 className="mb-2 h-6 w-6 text-[#3375FF]" />
          <p className="text-xl font-bold text-foreground">6</p>
          <p className="text-xs text-muted-foreground">axes analysés</p>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-4 text-center">
          <Zap className="mb-2 h-6 w-6 text-[#A055FF]" />
          <p className="text-xl font-bold text-foreground">3 min</p>
          <p className="text-xs text-muted-foreground">chrono</p>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-4 text-center">
          <TrendingUp className="mb-2 h-6 w-6 text-[#22c55e]" />
          <p className="text-xl font-bold text-foreground">PDF</p>
          <p className="text-xs text-muted-foreground">rapport complet</p>
        </div>
      </div>

      {/* What you get */}
      <div className="mb-8 w-full space-y-3">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Ce que vous obtiendrez
        </h2>
        {[
          "Votre score global de performance sur 100",
          "Un radar visuel sur 6 axes stratégiques",
          "Des projections à 3, 6 et 9 mois",
          "Une estimation de votre CA additionnel",
          "Des recommandations personnalisées",
        ].map((item) => (
          <div key={item} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#22c55e]">
              <span className="text-xs text-white">✓</span>
            </div>
            <p className="text-sm text-foreground">{item}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Votre email professionnel"
          required
          className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50"
        />

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3375FF] to-[#A055FF] text-lg font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Chargement..." : "Commencer mon diagnostic"}
          {!loading && <ArrowRight className="h-5 w-5" />}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Vos données restent confidentielles et ne seront jamais partagées.
      </p>
    </div>
  );
}
