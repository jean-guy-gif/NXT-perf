"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  ArrowRight,
  TrendingUp,
  Award,
  Target,
  AlertTriangle,
} from "lucide-react";
import { DPIRadar } from "@/components/dpi/dpi-radar";
import { DPIProjectionsCard } from "@/components/dpi/dpi-projections-card";
import { caBaseFromRange } from "@/lib/dpi-projections";
import { createClient } from "@/lib/supabase/client";
import type { DPIScores } from "@/lib/dpi-scoring";
import type { DPIAxis } from "@/lib/dpi-axes";
import { cn } from "@/lib/utils";

const AXIS_RECOMMENDATIONS: Record<string, string> = {
  intensite_commerciale: "Augmentez votre temps de prospection active — c'est le carburant de votre activité",
  generation_opportunites: "Multipliez vos sources d'estimation pour alimenter votre pipeline",
  solidite_portefeuille: "Renforcez votre stock de mandats pour sécuriser votre flux de ventes",
  maitrise_ratios: "Travaillez vos taux de transformation à chaque étape du tunnel",
  valorisation_economique: "Négociez mieux vos honoraires — chaque point compte sur votre CA",
  pilotage_strategique: "Structurez votre suivi d'activité avec des indicateurs hebdomadaires",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function DPIResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [scores, setScores] = useState<DPIScores | null>(null);
  const [loading, setLoading] = useState(true);
  const [projection, setProjection] = useState<"current" | "3m" | "6m" | "9m" | "potential">("current");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const dpiId = searchParams.get("id") ?? sessionStorage.getItem("dpi_id");

  useEffect(() => {
    const cached = sessionStorage.getItem("dpi_scores");
    if (cached) {
      try {
        setScores(JSON.parse(cached));
        setLoading(false);
        return;
      } catch { /* fall through */ }
    }

    if (!dpiId) {
      router.replace("/dpi");
      return;
    }

    async function loadScores() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("dpi_results")
        .select("scores")
        .eq("id", dpiId)
        .single();
      if (error) { router.replace("/dpi"); setLoading(false); return; }

      if (data?.scores) {
        setScores(data.scores as DPIScores);
      } else {
        router.replace("/dpi");
      }
      setLoading(false);
    }

    loadScores();
  }, [dpiId, router]);

  const handleDownloadPDF = async (theme: "dark" | "white" = "dark") => {
    if (!scores) return;
    setGeneratingPdf(true);

    const { generateDPIPDF } = await import("@/lib/dpi-pdf");
    const email = sessionStorage.getItem("dpi_email") ?? "";
    generateDPIPDF(scores, email, theme);

    if (dpiId) {
      const supabase = createClient();
      await supabase
        .from("dpi_results")
        .update({ status: "pdf_downloaded" })
        .eq("id", dpiId);
    }

    setGeneratingPdf(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!scores) return null;

  const weakAxes = scores.axes
    .filter((a) => a.score < 50)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  const levelColor =
    scores.globalScore < 30 ? "text-red-500"
    : scores.globalScore < 50 ? "text-orange-500"
    : scores.globalScore < 70 ? "text-yellow-500"
    : scores.globalScore < 85 ? "text-green-500"
    : "text-emerald-500";

  return (
    <div className="space-y-8">
      {/* ═══ SECTION 1 — PAGE HEADER ═══ */}
      <header className="text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Award className="h-3.5 w-3.5" />
          Vos résultats
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Votre Diagnostic de Performance Immobilière
        </h1>
        <p className="mt-3 text-muted-foreground">
          Voici votre photographie en 6 axes, vos projections, et les leviers à activer.
        </p>
      </header>

      {/* ═══ SECTION 2 — Score global ═══ */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="mb-1 text-sm text-muted-foreground">Score actuel</p>
          <p className={cn("text-4xl font-bold tabular-nums", levelColor)}>
            {scores.globalScore}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">/100</p>
          <p className={cn("mt-2 text-sm font-medium", levelColor)}>
            {scores.level}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="mb-1 text-sm text-muted-foreground">Potentiel</p>
          <p className="text-4xl font-bold tabular-nums text-[#A055FF]">
            {scores.potentialScore}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">/100</p>
          <p className="mt-2 text-sm font-medium text-[#A055FF]">
            +{scores.potentialScore - scores.globalScore} pts
          </p>
        </div>
      </div>

      {/* ═══ SECTION 3 — Percentile ═══ */}
      {scores.percentileLabel && (
        <div className="rounded-xl border border-[#3375FF]/20 bg-gradient-to-r from-[#3375FF]/5 to-[#A055FF]/5 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[#3375FF]/10">
            <Award className="h-6 w-6 text-[#3375FF]" />
          </div>
          <p className="text-lg font-bold text-[#3375FF]">
            {scores.percentileLabel}
          </p>
          {scores.percentileRegion && (
            <p className="mt-1 text-sm text-muted-foreground">
              {scores.percentileRegion}
            </p>
          )}
        </div>
      )}

      {/* ═══ SECTION 4 — Radar 6 axes ═══ */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Target className="h-3.5 w-3.5" />
          Radar 6 axes
        </div>
        <h2 className="mb-3 text-2xl font-bold text-foreground">
          Votre profil détaillé
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Comparez votre profil actuel à vos projections et au top performer.
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {(["current", "3m", "6m", "9m", "potential"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProjection(p)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                projection === p
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {p === "current" ? "Actuel" : p === "potential" ? "Potentiel" : `+${p}`}
            </button>
          ))}
        </div>
        <DPIRadar
          axes={scores.axes}
          topPerformer={scores.topPerformer}
          showProjection={projection}
        />
      </div>

      {/* ═══ SECTION 5 — Estimation CA additionnel ═══ */}
      {scores.estimatedCAGain.max > 0 && (
        <div className="rounded-xl border border-border bg-gradient-to-r from-[#3375FF]/5 to-[#A055FF]/5 p-6">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-foreground">
            Estimation CA additionnel
          </h3>
          <p className="text-muted-foreground">
            En optimisant vos leviers, vous pourriez aller chercher entre{" "}
            <strong className="text-foreground">{formatCurrency(scores.estimatedCAGain.min)}</strong> et{" "}
            <strong className="text-foreground">{formatCurrency(scores.estimatedCAGain.max)}</strong>{" "}
            de CA additionnel.
          </p>
        </div>
      )}

      {/* ═══ SECTION 6 — Axes d'amélioration prioritaires ═══ */}
      {weakAxes.length > 0 && (
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            Axes prioritaires
          </div>
          <h2 className="mb-3 text-2xl font-bold text-foreground">
            Vos axes d&apos;amélioration prioritaires
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Les 3 axes les plus faibles à travailler en priorité.
          </p>
          <div className="space-y-3">
            {weakAxes.map((axis) => (
              <div
                key={axis.id}
                className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{axis.label}</span>
                  <span className="text-sm font-bold tabular-nums text-orange-500">
                    {axis.score}/100
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {AXIS_RECOMMENDATIONS[axis.id]}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SECTION 7 — Projections NXT (composant intact) ═══ */}
      <DPIProjectionsCard
        currentAxes={scores.axes.map((a): DPIAxis => ({ id: a.id, label: a.label, score: a.score }))}
        currentGlobalScore={scores.globalScore}
        caBase={caBaseFromRange()}
      />

      {/* ═══ SECTION 8 — Encart CTA conclusion (R8/R9) ═══ */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
        <h3 className="mb-2 text-2xl font-bold text-foreground">
          Continuez votre parcours
        </h3>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          Téléchargez votre rapport et créez votre compte pour piloter votre performance
          en continu.
        </p>

        <div className="mb-4 flex gap-3">
          <button
            onClick={() => handleDownloadPDF("dark")}
            disabled={generatingPdf}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#0a0c1e] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            PDF Dark
          </button>
          <button
            onClick={() => handleDownloadPDF("white")}
            disabled={generatingPdf}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-[#0a0c1e] transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            PDF Pro
          </button>
        </div>

        <a
          href="/register"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3375FF] to-[#A055FF] font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
        >
          Créer mon compte NXT Performance
          <ArrowRight className="h-5 w-5" />
        </a>

        <p className="mt-3 text-xs text-muted-foreground">
          Sans engagement — 1 mois d&apos;essai complet
        </p>
      </div>

      {/* Subline finale */}
      <p className="text-center text-sm text-muted-foreground">
        Ce diagnostic est une photographie. NXT Performance vous permet de piloter votre
        performance en continu.
      </p>
    </div>
  );
}

export default function DPIResultsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <DPIResultsContent />
    </Suspense>
  );
}
