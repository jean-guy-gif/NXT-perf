"use client";

import { Activity, Download, Smile, Meh, Frown } from "lucide-react";
import { useDPIEvolution } from "@/hooks/use-dpi-evolution";
import { MiniRadar } from "@/components/dpi/mini-radar";
import { cn } from "@/lib/utils";

export function DpiMonthlyCard() {
  const {
    initialSnapshot,
    currentAxes,
    currentGlobalScore,
    globalDelta,
    smiley,
    hasSnapshot,
    initializeSnapshot,
    mounted,
  } = useDPIEvolution();

  if (!mounted || currentAxes.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />
          Mon DPI mensuel
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Vos axes DPI s'afficheront ici dès que des données seront
          disponibles.
        </p>
      </section>
    );
  }

  const SmileyIcon =
    smiley === "happy" ? Smile : smiley === "sad" ? Frown : Meh;
  const smileyTone =
    smiley === "happy"
      ? "text-emerald-500"
      : smiley === "sad"
        ? "text-red-500"
        : "text-orange-500";
  const smileyLabel =
    smiley === "happy"
      ? "En progression"
      : smiley === "sad"
        ? "En recul"
        : "Stable";

  const handleDownload = () => {
    const lines = [
      "NXT Performance — DPI mensuel",
      "",
      `Score global actuel : ${currentGlobalScore}/100`,
      `Delta vs référence : ${globalDelta >= 0 ? "+" : ""}${globalDelta} pts`,
      "",
      "Axes :",
      ...currentAxes.map((a) => `- ${a.label}: ${Math.round(a.score)}/100`),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nxt-dpi-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />
          Mon DPI mensuel
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold",
            smileyTone
          )}
        >
          <SmileyIcon className="h-3.5 w-3.5" />
          {smileyLabel}
          <span className="text-muted-foreground">
            ({globalDelta >= 0 ? "+" : ""}
            {globalDelta} pts)
          </span>
        </div>
      </div>

      <h3 className="mt-2 text-lg font-bold text-foreground">
        Score actuel : {currentGlobalScore}/100
      </h3>

      {hasSnapshot && initialSnapshot ? (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              DPI Référence
            </p>
            <div className="flex justify-center">
              <MiniRadar
                scores={initialSnapshot.axes}
                color="#888"
                size={200}
                showLabels
              />
            </div>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              {initialSnapshot.globalScore}/100 ·{" "}
              {new Date(initialSnapshot.date).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="mb-2 text-xs font-semibold text-primary">
              DPI Actuel
            </p>
            <div className="flex justify-center">
              <MiniRadar
                scores={currentAxes}
                color="var(--agency-primary, #3375FF)"
                size={200}
                showLabels
              />
            </div>
            <p className="mt-1 text-center text-xs font-bold text-foreground">
              {currentGlobalScore}/100
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex justify-center">
            <MiniRadar
              scores={currentAxes}
              color="var(--agency-primary, #3375FF)"
              size={220}
              showLabels
            />
          </div>
          <button
            type="button"
            onClick={initializeSnapshot}
            className="mt-3 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Prendre mon DPI de référence
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleDownload}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Download className="h-3.5 w-3.5" />
        Télécharger DPI
      </button>
    </section>
  );
}
