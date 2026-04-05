"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(
    resetSuccess ? "Mot de passe réinitialisé avec succès. Connectez-vous." : ""
  );
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      if (authError.message.includes("Invalid login credentials")) {
        setError("Email ou mot de passe incorrect.");
      } else {
        setError(authError.message);
      }
      return;
    }

    // Full reload to ensure session cookies are sent
    window.location.href = "/dashboard";
  };

  const handleDemo = () => {
    router.push("/demo");
  };

  const inputClassName =
    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  return (
    <>
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

    <div className="rounded-xl border border-border bg-card p-8">
      <div className="mb-6 flex justify-center">
        <img src="/logo-icon.svg" alt="NXT Perf" className="h-12 w-12" />
      </div>
      <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
        Connexion
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Accédez à votre tableau de bord
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClassName}
            placeholder="jean@start-academy.fr"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Mot de passe
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClassName} pr-10`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
              title={showPassword ? "Masquer" : "Afficher"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {success && (
          <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
            {success}
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-10 w-full rounded-lg bg-primary font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <button
        onClick={handleDemo}
        className="h-10 w-full rounded-lg border border-border bg-background font-medium text-foreground transition-colors hover:bg-muted"
      >
        Tester en démo
      </button>

      <div className="mt-4 flex justify-between text-sm">
        <Link
          href="/forgot-password"
          className="text-muted-foreground hover:text-foreground"
        >
          Mot de passe oublié ?
        </Link>
        <Link
          href="/register"
          className="text-primary hover:text-primary/80"
        >
          Créer un compte
        </Link>
      </div>
    </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
