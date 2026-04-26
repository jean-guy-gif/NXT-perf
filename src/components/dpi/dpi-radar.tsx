"use client";

// Note : couleurs hardcodées (et non via CSS variables --foreground/--border/--muted-foreground)
// car Chart.js Canvas ne sait pas évaluer hsl(oklch(...)) ni hsl(color-mix(...)).
// Ces tokens DS imbriquent OKLCH/color-mix dans hsl(), ce qui est non-parsable.
// Page (public)/dpi/resultats est dark-first — couleurs optimisées pour ce mode.
// Si toggle light mode introduit plus tard, basculer en MutationObserver-based theming.

import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import type { DPIAxisScore } from "@/lib/dpi-scoring";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface DPIRadarProps {
  axes: DPIAxisScore[];
  topPerformer: Record<string, number>;
  showProjection: "current" | "3m" | "6m" | "9m" | "potential";
}

export function DPIRadar({ axes, topPerformer, showProjection }: DPIRadarProps) {
  const labels = axes.map((a) => a.label);
  const scores = axes.map((a) => a.score);
  const topData = axes.map((a) => topPerformer[a.id] ?? 80);

  const projectionData = axes.map((a) => {
    switch (showProjection) {
      case "3m": return a.projection3m;
      case "6m": return a.projection6m;
      case "9m": return a.projection9m;
      case "potential": return a.potential;
      default: return a.score;
    }
  });

  const projectionLabel =
    showProjection === "current" ? "Actuel"
    : showProjection === "potential" ? "Potentiel"
    : `Projection ${showProjection}`;

  const datasets = [
    {
      label: "Top Performer",
      data: topData,
      borderColor: "#9ca3af",
      backgroundColor: "transparent",
      borderDash: [4, 4],
      borderWidth: 1.5,
      pointRadius: 0,
    },
    ...(showProjection !== "current"
      ? [{
          label: projectionLabel,
          data: projectionData,
          borderColor: "var(--agency-secondary, #A055FF)",
          backgroundColor: "rgba(160, 85, 255, 0.22)",
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 2,
        }]
      : []),
    {
      label: "Actuel",
      data: scores,
      borderColor: "var(--agency-primary, #3375FF)",
      backgroundColor: "rgba(51, 117, 255, 0.35)",
      borderWidth: 2.5,
      pointRadius: 3,
      pointBackgroundColor: "var(--agency-primary, #3375FF)",
    },
  ];

  return (
    <div className="overflow-hidden" style={{ height: 400 }}>
      <Radar
        data={{ labels, datasets }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              min: 0,
              max: 100,
              ticks: { display: false },
              grid: { color: "rgba(255, 255, 255, 0.12)" },
              angleLines: { color: "rgba(255, 255, 255, 0.12)" },
              pointLabels: { color: "#e5e7eb", font: { size: 12 } },
            },
          },
          plugins: {
            legend: { labels: { color: "#e5e7eb", font: { size: 12 }, padding: 16 } },
            tooltip: {
              backgroundColor: "#0a0c1e",
              titleColor: "#e5e7eb",
              bodyColor: "#e5e7eb",
              borderColor: "rgba(255, 255, 255, 0.12)",
              borderWidth: 1,
            },
          },
        }}
      />
    </div>
  );
}
