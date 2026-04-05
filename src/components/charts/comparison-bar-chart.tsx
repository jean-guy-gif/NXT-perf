"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js";
import type { EntityBar } from "@/hooks/use-agency-gps";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const STATUS_FILL: Record<string, string> = {
  ok: "#39C97E",
  warning: "#FFA448",
  danger: "#EF7550",
};

interface ComparisonBarChartProps {
  data: EntityBar[];
}

export function ComparisonBarChart({ data }: ComparisonBarChartProps) {
  const labels = data.map((d) => d.name);
  const colors = data.map((d) => STATUS_FILL[d.status] ?? STATUS_FILL.danger);

  return (
    <div className="overflow-hidden" style={{ height: Math.max(400, data.length * 50) }}>
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: "Réalisé",
              data: data.map((d) => d.realise),
              backgroundColor: colors,
              borderRadius: 4,
              maxBarThickness: 24,
            },
            {
              label: "Objectif",
              data: data.map((d) => d.objectif),
              backgroundColor: "hsl(var(--muted-foreground) / 0.15)",
              borderColor: "hsl(var(--foreground) / 0.4)",
              borderWidth: 1,
              borderSkipped: false,
              borderRadius: 4,
              maxBarThickness: 24,
            },
          ],
        }}
        options={{
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, labels: { color: "hsl(var(--muted-foreground))", font: { size: 11 } } },
            tooltip: {
              backgroundColor: "hsl(var(--card))",
              titleColor: "hsl(var(--foreground))",
              bodyColor: "hsl(var(--foreground))",
              borderColor: "hsl(var(--border))",
              borderWidth: 1,
              padding: 8,
              callbacks: {
                afterBody(items) {
                  const idx = items[0]?.dataIndex;
                  if (idx == null) return "";
                  const d = data[idx];
                  const ecart = d.realise - d.objectif;
                  return `Écart: ${ecart >= 0 ? "+" : ""}${ecart.toLocaleString("fr-FR")} (${d.pct}%)`;
                },
              },
            },
          },
          scales: {
            x: { grid: { color: "hsl(var(--border) / 0.3)" }, ticks: { color: "hsl(var(--muted-foreground))", font: { size: 11 } } },
            y: {
              grid: { display: false },
              ticks: { color: "hsl(var(--muted-foreground))", font: { size: 11 } },
            },
          },
        }}
      />
    </div>
  );
}
