"use client";

import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface DonutChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  centerLabel?: string;
  centerValue?: string;
  height?: number;
}

export function DonutChart({ data, centerLabel, centerValue, height = 250 }: DonutChartProps) {
  const chartData = {
    labels: data.map((d) => d.name),
    datasets: [
      {
        data: data.map((d) => d.value),
        backgroundColor: data.map((d) => d.color),
        borderWidth: 0,
        spacing: 3,
      },
    ],
  };

  return (
    <div className="relative overflow-hidden" style={{ height }}>
      <Doughnut
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: "60%",
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "hsl(var(--card))",
              titleColor: "hsl(var(--foreground))",
              bodyColor: "hsl(var(--foreground))",
              borderColor: "hsl(var(--border))",
              borderWidth: 1,
              padding: 8,
            },
          },
        }}
      />
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerValue && <span className="text-2xl font-bold text-foreground">{centerValue}</span>}
          {centerLabel && <span className="text-xs text-muted-foreground">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}
