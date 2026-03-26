"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, ArrowRight, TrendingUp, Award } from "lucide-react";
import { DPIRadar } from "@/components/dpi/dpi-radar";
import { DPIProjectionsCard } from "@/components/dpi/dpi-projections-card";
import { computeDPIProjections } from "@/lib/dpi-projections";
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
      const { data } = await supabase
        .from("dpi_results")
        .select("scores")
        .eq("id", dpiId)
        .single();

      if (data?.scores) {
        setScores(data.scores as DPIScores);
      } else {
        router.replace("/dpi");
      }
      setLoading(false);
    }

    loadScores();
  }, [dpiId, router]);

  const handleDownloadPDF = async () => {
    if (!scores) return;
    setGeneratingPdf(true);

    const { generateDPIPDF } = await import("@/lib/dpi-pdf");
    const email = sessionStorage.getItem("dpi_email") ?? "";
    generateDPIPDF(scores, email);

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
      {/* Header */}
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
          Votre Diagnostic de Performance
        </h1>
        <p className="text-muted-foreground">Immobilière</p>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="mb-1 text-sm text-muted-foreground">Score actuel</p>
          <p className={cn("text-4xl font-bold", levelColor)}>
            {scores.globalScore}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">/100</p>
          <p className={cn("mt-2 text-sm font-medium", levelColor)}>
            {scores.level}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="mb-1 text-sm text-muted-foreground">Potentiel</p>
          <p className="text-4xl font-bold text-[#A055FF]">
            {scores.potentialScore}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">/100</p>
          <p className="mt-2 text-sm font-medium text-[#A055FF]">
            +{scores.potentialScore - scores.globalScore} pts
          </p>
        </div>
      </div>

      {/* Percentile */}
      {scores.percentileLabel && (
        <div className="rounded-xl border border-[#3375FF]/20 bg-gradient-to-r from-[#3375FF]/5 to-[#A055FF]/5 p-5 text-center">
          <Award className="mx-auto mb-2 h-8 w-8 text-[#3375FF]" />
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

      {/* Radar */}
      <div className="rounded-xl border border-border bg-card p-4">
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

      {/* CA estimation */}
      {scores.estimatedCAGain.max > 0 && (
        <div className="rounded-xl border border-border bg-gradient-to-r from-[#3375FF]/5 to-[#A055FF]/5 p-6">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Estimation CA additionnel</h3>
          </div>
          <p className="text-muted-foreground">
            En optimisant vos leviers, vous pourriez aller chercher entre{" "}
            <strong className="text-foreground">{formatCurrency(scores.estimatedCAGain.min)}</strong> et{" "}
            <strong className="text-foreground">{formatCurrency(scores.estimatedCAGain.max)}</strong>{" "}
            de CA additionnel.
          </p>
        </div>
      )}

      {/* Recommendations */}
      {weakAxes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Axes d'amélioration prioritaires</h3>
          {weakAxes.map((axis) => (
            <div
              key={axis.id}
              className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{axis.label}</span>
                <span className="text-sm font-bold text-orange-500">{axis.score}/100</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {AXIS_RECOMMENDATIONS[axis.id]}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Projections NXT */}
      <DPIProjectionsCard
        currentAxes={scores.axes.map((a): DPIAxis => ({ id: a.id, label: a.label, score: a.score }))}
        currentGlobalScore={scores.globalScore}
      />

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={handleDownloadPDF}
          disabled={generatingPdf}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <Download className="h-5 w-5" />
          {generatingPdf ? "Génération..." : "Télécharger mon diagnostic PDF"}
        </button>

        <a
          href="/register"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3375FF] to-[#A055FF] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Créer mon compte NXT Performance
          <ArrowRight className="h-5 w-5" />
        </a>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Ce diagnostic est une photographie. NXT Performance vous permet de piloter votre performance en continu.
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
