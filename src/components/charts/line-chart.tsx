"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface LineChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  lines: Array<{
    dataKey: string;
    color: string;
    name: string;
  }>;
  height?: number;
  showGrid?: boolean;
}

export function LineChart({ data, xKey, lines, height, showGrid = false }: LineChartProps) {
  const labels = data.map((d) => String(d[xKey] ?? ""));

  const datasets = lines.map((line) => ({
    label: line.name,
    data: data.map((d) => Number(d[line.dataKey] ?? 0)),
    borderColor: line.color,
    backgroundColor: line.color + "30",
    tension: 0.3,
    pointRadius: 3,
    pointHoverRadius: 5,
    borderWidth: 2,
    fill: false,
  }));

  return (
    <div className="overflow-hidden" style={{ height: height ?? "clamp(220px, 30vh, 360px)" }}>
      <Line
        data={{ labels, datasets }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: lines.length > 1, labels: { color: "hsl(var(--muted-foreground))", font: { size: 11 } } },
            tooltip: {
              backgroundColor: "hsl(var(--card))",
              titleColor: "hsl(var(--foreground))",
              bodyColor: "hsl(var(--foreground))",
              borderColor: "hsl(var(--border))",
              borderWidth: 1,
              padding: 8,
            },
          },
          scales: {
            x: { grid: { display: showGrid, color: "hsl(var(--border) / 0.3)" }, ticks: { color: "hsl(var(--muted-foreground))", font: { size: 11 } } },
            y: { grid: { color: "hsl(var(--border) / 0.3)" }, ticks: { color: "hsl(var(--muted-foreground))", font: { size: 11 } } },
          },
        }}
      />
    </div>
  );
}
