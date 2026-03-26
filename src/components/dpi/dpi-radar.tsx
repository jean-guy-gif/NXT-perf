"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DPIAxisScore } from "@/lib/dpi-scoring";

interface DPIRadarProps {
  axes: DPIAxisScore[];
  topPerformer: Record<string, number>;
  showProjection: "current" | "3m" | "6m" | "9m" | "potential";
}

export function DPIRadar({ axes, topPerformer, showProjection }: DPIRadarProps) {
  const data = axes.map((a) => {
    let projectionValue = a.score;
    switch (showProjection) {
      case "3m": projectionValue = a.projection3m; break;
      case "6m": projectionValue = a.projection6m; break;
      case "9m": projectionValue = a.projection9m; break;
      case "potential": projectionValue = a.potential; break;
    }

    return {
      axis: a.label,
      score: a.score,
      projection: projectionValue,
      top: topPerformer[a.id] ?? 80,
    };
  });

  const projectionLabel =
    showProjection === "current" ? "Actuel"
    : showProjection === "potential" ? "Potentiel"
    : `Projection ${showProjection}`;

  return (
    <div style={{ width: "100%", height: "320px" }}>
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="var(--color-border, #e5e7eb)" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground, #6b7280)" }}
          tickFormatter={(value: string) => value.length > 12 ? value.slice(0, 10) + "…" : value}
        />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />

        {/* Top Performer reference */}
        <Radar
          name="Top Performer"
          dataKey="top"
          stroke="#888"
          fill="none"
          strokeDasharray="3 3"
          strokeOpacity={0.5}
        />

        {/* Projection / Potential */}
        {showProjection !== "current" && (
          <Radar
            name={projectionLabel}
            dataKey="projection"
            stroke="#A055FF"
            fill="#A055FF"
            fillOpacity={0.15}
            strokeDasharray="5 5"
          />
        )}

        {/* Current score */}
        <Radar
          name="Actuel"
          dataKey="score"
          stroke="#3375FF"
          fill="#3375FF"
          fillOpacity={0.3}
        />

        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
        />
      </RadarChart>
    </ResponsiveContainer>
    </div>
  );
}
