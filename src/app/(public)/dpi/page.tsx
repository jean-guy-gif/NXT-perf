"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DPILandingPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return;

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("dpi_results")
        .insert({ email: email.trim(), status: "started" })
        .select("id")
        .single();

      if (insertError) {
        setError("Une erreur est survenue. Réessayez.");
        setLoading(false);
        return;
      }

      if (data) {
        sessionStorage.setItem("dpi_id", data.id);
        sessionStorage.setItem("dpi_email", email.trim());
        router.push("/dpi/questionnaire");
      }
    } catch {
      setError("Une erreur est survenue. Réessayez.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-8 flex items-center gap-2">
        <img src="/logo-icon.svg" alt="NXT Perf" className="h-10 w-10" />
        <span className="text-lg font-bold text-foreground">NXT Performance</span>
      </div>

      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#3375FF] to-[#A055FF]">
        <Target className="h-12 w-12 text-white" />
      </div>

      <div className="mb-4 flex justify-center">
        <span className="rounded-full bg-[#22c55e] px-4 py-1 text-xs font-bold uppercase text-white">
          100% GRATUIT
        </span>
      </div>

      <h1 className="mb-3 text-center text-3xl font-bold text-foreground">
        Diagnostic de Performance Immobilière
      </h1>
      <p className="mb-8 text-center text-muted-foreground">
        Évaluez votre performance en 3 minutes et découvrez votre potentiel
      </p>

      <div className="mb-6 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-primary">16</p>
          <p className="text-xs text-muted-foreground">questions</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-primary">3 min</p>
          <p className="text-xs text-muted-foreground">chrono</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-primary">6</p>
          <p className="text-xs text-muted-foreground">axes analysés</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
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
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3375FF] to-[#A055FF] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
