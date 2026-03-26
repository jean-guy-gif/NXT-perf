"use client";

import { useState, useEffect } from "react";
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

// Custom bar shape that draws the coloured bar for "realise" and a dashed line for "objectif".
// The bar's dataKey is max(realise, objectif) so the chart domain always includes both values.
function BarWithObjective(props: {
  x?: number; y?: number; width?: number; height?: number;
  payload?: EntityBar & { value: number };
  fill?: string;
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload, fill } = props;
  if (!payload) return null;

  const maxVal = payload.value; // max(realise, objectif)
  const scale = maxVal > 0 ? width / maxVal : 0;
  const realiseWidth = Math.max(0, payload.realise * scale);
  const objLineX = x + payload.objectif * scale;

  return (
    <g>
      {/* Coloured bar for realise only */}
      <rect x={x} y={y} width={realiseWidth} height={height} fill={fill} rx={4} ry={4} />
      {/* Objective marker line */}
      {payload.objectif > 0 && (
        <line
          x1={objLineX}
          y1={y - 4}
          x2={objLineX}
          y2={y + height + 4}
          stroke="var(--foreground)"
          strokeWidth={2.5}
          strokeDasharray="4 3"
          opacity={0.85}
        />
      )}
    </g>
  );
}

const NIVEAU_TAG: Record<string, { label: string; color: string }> = {
  agence: { label: "AGC", color: "#6366f1" },
  manager: { label: "MGR", color: "#8b5cf6" },
};

function CustomYTick({ x, y, payload, data, isMobile }: {
  x?: number; y?: number;
  payload?: { value: string; index: number };
  data: (EntityBar & { value: number })[];
  isMobile?: boolean;
}) {
  if (!payload) return null;
  const entry = data[payload.index];
  if (!entry) return null;

  const tag = NIVEAU_TAG[entry.niveau];
  const isConseiller = entry.niveau === "conseiller";
  const textColor = "color-mix(in oklch, currentColor, transparent 45%)";
  const lightColor = "color-mix(in oklch, currentColor, transparent 60%)";
  const nameMaxLen = isMobile ? 10 : 999;
  const truncName = entry.name.length > nameMaxLen ? entry.name.slice(0, nameMaxLen) + "…" : entry.name;

  if (isMobile) {
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={-5}
          y={1}
          textAnchor="end"
          fontSize={10}
          fontWeight={tag ? 600 : 400}
          fill={tag ? tag.color : isConseiller ? lightColor : textColor}
          dominantBaseline="middle"
        >
          {truncName}
        </text>
      </g>
    );
  }

  return (
    <g transform={`translate(${x},${y})`}>
      {tag ? (
        <>
          <rect
            x={-110}
            y={-9}
            width={30}
            height={18}
            rx={4}
            fill={tag.color}
            opacity={0.15}
          />
          <text
            x={-95}
            y={1}
            textAnchor="middle"
            fontSize={9}
            fontWeight={600}
            fill={tag.color}
            dominantBaseline="middle"
          >
            {tag.label}
          </text>
          <text
            x={-75}
            y={1}
            textAnchor="start"
            fontSize={12}
            fontWeight={entry.niveau === "agence" ? 700 : 500}
            fill={textColor}
            dominantBaseline="middle"
          >
            {entry.name}
          </text>
        </>
      ) : (
        <text
          x={-65}
          y={1}
          textAnchor="start"
          fontSize={11}
          fontWeight={400}
          fill={isConseiller ? lightColor : textColor}
          dominantBaseline="middle"
        >
          {entry.name}
        </text>
      )}
    </g>
  );
}

export function ComparisonBarChart({ data }: ComparisonBarChartProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const chartData = data.map(d => ({
    ...d,
    value: Math.max(d.realise, d.objectif),
  }));

  const chartHeight = Math.max(300, data.length * (isMobile ? 36 : 50));
  const yAxisWidth = isMobile ? 70 : 130;
  const marginLeft = isMobile ? 70 : 130;
  const marginRight = isMobile ? 16 : 40;

  return (
    <div className="overflow-x-hidden" style={{ width: "100%", height: `${chartHeight}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" barSize={isMobile ? 16 : 24} margin={{ left: marginLeft, right: marginRight, top: 4, bottom: 4 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="color-mix(in oklch, currentColor, transparent 88%)"
            horizontal={false}
          />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "color-mix(in oklch, currentColor, transparent 45%)", fontSize: isMobile ? 10 : 12 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={<CustomYTick data={chartData} isMobile={isMobile} />}
            width={yAxisWidth}
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
