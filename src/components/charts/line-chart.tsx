"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

export function LineChart({
  data,
  xKey,
  lines,
  showGrid = false,
}: LineChartProps) {
  return (
    <div style={{ width: "100%", height: "clamp(220px, 30vh, 360px)" }}>
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={data}>
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="color-mix(in oklch, currentColor, transparent 88%)"
            vertical={false}
          />
        )}
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
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.color}
            name={line.name}
            strokeWidth={2}
            dot={{ fill: line.color, r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
    </div>
  );
}
