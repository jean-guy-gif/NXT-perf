"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { useAppStore } from "@/stores/app-store";

const DEMO_CODE = "DEMO2024";

export default function DemoPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const enterDemo = useAppStore((s) => s.enterDemo);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (code.trim().toUpperCase() !== DEMO_CODE) {
      setError("Code invalide");
      return;
    }

    setLoading(true);

    // Enter demo mode (sets nxt-demo-mode cookie + mock data)
    enterDemo();

    // Override demo cookie to 8h
    document.cookie = "nxt-demo-mode=true;path=/;max-age=28800";

    // Ensure nxt-demo-onboarding is NOT set — it will be set by the CTA after completing onboarding
    document.cookie = "nxt-demo-onboarding=;path=/;max-age=0";

    router.push("/onboarding/identite");
  };

  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="mb-6 flex justify-center">
        <img src="/logo-icon.svg" alt="NXT Perf" className="h-12 w-12" />
      </div>

      <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
        Accès démonstration
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Saisissez votre code d'accès pour découvrir la plateforme.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Code d'accès
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(""); }}
              className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="Entrez le code"
              autoFocus
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          Démarrer la démo
        </button>
      </form>
    </div>
  );
}
