"use client";

import { TrendingUp, Share2, Download } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { NXT_MONTHLY_PRICE_EUR } from "@/lib/roi-calculator";
import type { RoiSummary } from "@/lib/roi-calculator";

interface Props {
  summary: RoiSummary;
}

export function RoiCompteurCard({ summary }: Props) {
  const { totalEuros, roiMultiplier, monthsSinceFirstPlan, totalCostEur } =
    summary;

  const handleShare = async () => {
    const text = `Avec NXT Performance, j'ai généré ${formatCurrency(
      totalEuros
    )} en ${monthsSinceFirstPlan} mois — ROI ×${roiMultiplier}.`;
    if (typeof navigator === "undefined") return;
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
      clipboard?: { writeText: (s: string) => Promise<void> };
    };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: "Mon ROI NXT Performance", text });
        return;
      } catch {
        // user cancelled — fall through to clipboard
      }
    }
    if (nav.clipboard) {
      try {
        await nav.clipboard.writeText(text);
      } catch {
        /* ignore */
      }
    }
  };

  const handleDownload = () => {
    // V1 placeholder — un vrai PDF arrivera plus tard.
    const blob = new Blob(
      [
        `NXT Performance — Bilan ROI\n\nGain cumulé : ${formatCurrency(
          totalEuros
        )}\nDurée : ${monthsSinceFirstPlan} mois\nCoût total : ${formatCurrency(
          totalCostEur
        )}\nROI : ×${roiMultiplier}\n`,
      ],
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nxt-roi-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      aria-label="ROI cumulé"
      className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 shadow-sm md:p-8"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <TrendingUp className="h-3.5 w-3.5" />
        ROI NXT — Gain cumulé
      </div>

      <p className="mt-4 text-5xl font-bold tabular-nums text-foreground md:text-6xl">
        +{formatCurrency(totalEuros)}
      </p>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        En {monthsSinceFirstPlan}{" "}
        {monthsSinceFirstPlan > 1 ? "mois" : "mois"}, vous avez généré{" "}
        <span className="font-bold text-foreground">
          {formatCurrency(totalEuros)}
        </span>{" "}
        avec un abonnement NXT à {NXT_MONTHLY_PRICE_EUR} €/mois — soit un ROI{" "}
        <span className="font-bold text-emerald-600 dark:text-emerald-500">
          ×{roiMultiplier}
        </span>{" "}
        sur votre investissement.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Share2 className="h-4 w-4" />
          Partager mon ROI
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Télécharger
        </button>
      </div>
    </section>
  );
}
