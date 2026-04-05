"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  bars: Array<{
    dataKey: string;
    color: string;
    name: string;
  }>;
  height?: number;
}

export function BarChart({ data, xKey, bars, height }: BarChartProps) {
  const labels = data.map((d) => String(d[xKey] ?? ""));

  const datasets = bars.map((bar) => ({
    label: bar.name,
    data: data.map((d) => Number(d[bar.dataKey] ?? 0)),
    backgroundColor: bar.color,
    borderRadius: 4,
    maxBarThickness: 40,
  }));

  return (
    <div className="overflow-hidden" style={{ height: height ?? "clamp(220px, 30vh, 360px)" }}>
      <Bar
        data={{ labels, datasets }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: bars.length > 1, labels: { color: "hsl(var(--muted-foreground))", font: { size: 11 } } },
            tooltip: {
              backgroundColor: "hsl(var(--card))",
              titleColor: "hsl(var(--foreground))",
              bodyColor: "hsl(var(--foreground))",
              borderColor: "hsl(var(--border))",
              borderWidth: 1,
              padding: 8,
              titleFont: { size: 12 },
              bodyFont: { size: 11 },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: "hsl(var(--muted-foreground))", font: { size: 11 } } },
            y: { grid: { color: "hsl(var(--border) / 0.3)" }, ticks: { color: "hsl(var(--muted-foreground))", font: { size: 11 } } },
          },
        }}
      />
    </div>
  );
}
