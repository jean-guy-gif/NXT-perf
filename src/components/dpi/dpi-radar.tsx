"use client";

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
      borderColor: "#888",
      backgroundColor: "transparent",
      borderDash: [4, 4],
      borderWidth: 1,
      pointRadius: 0,
    },
    ...(showProjection !== "current"
      ? [{
          label: projectionLabel,
          data: projectionData,
          borderColor: "var(--agency-secondary, #A055FF)",
          backgroundColor: "rgba(160, 85, 255, 0.15)",
          borderDash: [5, 5],
          borderWidth: 1.5,
          pointRadius: 2,
        }]
      : []),
    {
      label: "Actuel",
      data: scores,
      borderColor: "var(--agency-primary, #3375FF)",
      backgroundColor: "rgba(51, 117, 255, 0.25)",
      borderWidth: 2,
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
              grid: { color: "hsl(var(--border) / 0.4)" },
              angleLines: { color: "hsl(var(--border) / 0.4)" },
              pointLabels: { color: "hsl(var(--muted-foreground))", font: { size: 11 } },
            },
          },
          plugins: {
            legend: { labels: { color: "hsl(var(--muted-foreground))", font: { size: 12 }, padding: 16 } },
            tooltip: {
              backgroundColor: "hsl(var(--card))",
              titleColor: "hsl(var(--foreground))",
              bodyColor: "hsl(var(--foreground))",
              borderColor: "hsl(var(--border))",
              borderWidth: 1,
            },
          },
        }}
      />
    </div>
  );
}
