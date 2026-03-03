"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { EntityBar } from "@/hooks/use-agency-gps";

const STATUS_FILL = {
  ok: "#39C97E",
  warning: "#FFA448",
  danger: "#EF7550",
};

interface ComparisonBarChartProps {
  data: EntityBar[];
}

function CustomTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ payload: EntityBar }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const ecart = d.realise - d.objectif;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{d.name}</p>
      <p className="text-muted-foreground">Réalisé : {d.realise.toLocaleString("fr-FR")}</p>
      <p className="text-muted-foreground">Objectif : {d.objectif.toLocaleString("fr-FR")}</p>
      <p className={ecart >= 0 ? "text-green-500" : "text-red-500"}>
        Écart : {ecart >= 0 ? "+" : ""}{ecart.toLocaleString("fr-FR")} ({d.pct}%)
      </p>
    </div>
  );
}

// Custom bar shape that draws the objective marker line
function BarWithObjective(props: {
  x?: number; y?: number; width?: number; height?: number;
  payload?: EntityBar;
  fill?: string;
  background?: { height: number };
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload, fill, background } = props;
  if (!payload) return null;

  // Calculate objective line X position using the bar's scale
  // The bar width represents "realise", we need to find where "objectif" falls
  const barScale = payload.realise > 0 ? width / payload.realise : 0;
  const objLineX = x + (payload.objectif * barScale);

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />
      {/* Objective marker line */}
      {payload.objectif > 0 && (
        <line
          x1={objLineX}
          y1={y - 2}
          x2={objLineX}
          y2={y + height + 2}
          stroke="var(--foreground)"
          strokeWidth={2}
          strokeDasharray="4 2"
          opacity={0.6}
        />
      )}
    </g>
  );
}

export function ComparisonBarChart({ data }: ComparisonBarChartProps) {
  const chartData = data.map(d => ({
    ...d,
    value: d.realise,
    label: d.niveau === "conseiller" ? `  ${d.name}` : d.name,
  }));

  return (
    <div style={{ width: "100%", height: `${Math.max(400, data.length * 50)}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" barSize={24} margin={{ left: 120, right: 40 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="color-mix(in oklch, currentColor, transparent 88%)"
            horizontal={false}
          />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "color-mix(in oklch, currentColor, transparent 45%)", fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "color-mix(in oklch, currentColor, transparent 45%)", fontSize: 12 }}
            width={110}
          />
          <Tooltip content={<CustomTooltipContent />} cursor={false} />
          <Bar dataKey="value" shape={<BarWithObjective />}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={STATUS_FILL[entry.status]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
