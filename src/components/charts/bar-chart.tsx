"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

export function BarChart({ data, xKey, bars }: BarChartProps) {
  return (
    <div style={{ width: "100%", height: "clamp(220px, 30vh, 360px)" }}>
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart data={data} barGap={4}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="color-mix(in oklch, currentColor, transparent 88%)"
          vertical={false}
        />
        <XAxis
          dataKey={xKey}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "color-mix(in oklch, currentColor, transparent 45%)", fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "color-mix(in oklch, currentColor, transparent 45%)", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card, #0F1F46)",
            border: "1px solid var(--border, #1a2d5a)",
            borderRadius: "var(--radius-button)",
            color: "var(--foreground, white)",
            fontSize: "12px",
          }}
        />
        {bars.map((bar) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            fill={bar.color}
            name={bar.name}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
    </div>
  );
}
