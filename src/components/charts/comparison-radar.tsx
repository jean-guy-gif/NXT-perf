"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface RadarAxis {
  id: string;
  label: string;
  score: number;
}

interface ComparisonRadarProps {
  axes: RadarAxis[]; // dataset principal (Moi)
  overlayAxes?: RadarAxis[]; // dataset secondaire (Autre)
  primaryLabel?: string;
  overlayLabel?: string;
  primaryColor?: string;
  overlayColor?: string;
  size?: number;
  maxValue?: number;
  showLabels?: boolean;
  className?: string;
}

export function ComparisonRadar({
  axes,
  overlayAxes,
  primaryLabel = "Moi",
  overlayLabel = "Autre",
  primaryColor = "#3375FF",
  overlayColor = "#FF8A3D",
  size = 400,
  maxValue = 150,
  showLabels = true,
  className,
}: ComparisonRadarProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const n = axes.length;
  if (n < 3) return null;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 60;
  const angleStep = (2 * Math.PI) / n;

  function getPoint(idx: number, value: number): { x: number; y: number } {
    const angle = -Math.PI / 2 + idx * angleStep;
    const r = (Math.min(value, maxValue) / maxValue) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  function getLabelPosition(idx: number): { x: number; y: number; anchor: "start" | "middle" | "end" } {
    const angle = -Math.PI / 2 + idx * angleStep;
    const labelRadius = radius + 25;
    const x = cx + labelRadius * Math.cos(angle);
    const y = cy + labelRadius * Math.sin(angle);
    let anchor: "start" | "middle" | "end" = "middle";
    if (Math.cos(angle) > 0.3) anchor = "start";
    else if (Math.cos(angle) < -0.3) anchor = "end";
    return { x, y, anchor };
  }

  const primaryPoints = axes.map((a, i) => getPoint(i, a.score));
  const primaryPath =
    primaryPoints.map((p, i) => (i === 0 ? "M" : "L") + p.x + "," + p.y).join(" ") + " Z";

  const overlayPoints = overlayAxes
    ? overlayAxes.map((a, i) => getPoint(i, a.score))
    : null;
  const overlayPath = overlayPoints
    ? overlayPoints.map((p, i) => (i === 0 ? "M" : "L") + p.x + "," + p.y).join(" ") + " Z"
    : null;

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className={cn("relative w-full max-w-[420px]", className)}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="h-auto w-full overflow-visible"
      >
        {/* Grille circulaire */}
        {gridLevels.map((level) => (
          <circle
            key={level}
            cx={cx}
            cy={cy}
            r={radius * level}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            className="text-border/50"
          />
        ))}

        {/* Axes radiaux */}
        {axes.map((_, i) => {
          const endPoint = getPoint(i, maxValue);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke="currentColor"
              strokeWidth={1}
              className="text-border/30"
            />
          );
        })}

        {/* Polygone overlay (Autre) sous le primary */}
        {overlayPath && (
          <path
            d={overlayPath}
            fill={overlayColor}
            fillOpacity={0.25}
            stroke={overlayColor}
            strokeWidth={2}
          />
        )}

        {/* Polygone primary (Moi) */}
        <path
          d={primaryPath}
          fill={primaryColor}
          fillOpacity={0.25}
          stroke={primaryColor}
          strokeWidth={2}
        />

        {/* Points overlay */}
        {overlayPoints?.map((p, i) => (
          <circle
            key={`overlay-${i}`}
            cx={p.x}
            cy={p.y}
            r={hoveredIdx === i ? 6 : 4}
            fill={overlayColor}
            stroke="white"
            strokeWidth={2}
            className="cursor-pointer transition-all"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}

        {/* Points primary */}
        {primaryPoints.map((p, i) => (
          <circle
            key={`primary-${i}`}
            cx={p.x}
            cy={p.y}
            r={hoveredIdx === i ? 6 : 4}
            fill={primaryColor}
            stroke="white"
            strokeWidth={2}
            className="cursor-pointer transition-all"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}

        {/* Labels d'axes */}
        {showLabels &&
          axes.map((axis, i) => {
            const pos = getLabelPosition(i);
            return (
              <text
                key={axis.id}
                x={pos.x}
                y={pos.y}
                textAnchor={pos.anchor}
                dominantBaseline="middle"
                className={cn(
                  "fill-current text-[11px] transition-colors",
                  hoveredIdx === i
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {axis.label}
              </text>
            );
          })}
      </svg>

      {/* Tooltip — position en coords SVG (précise à l'échelle 1:1 desktop) */}
      {hoveredIdx !== null && (
        <div
          className="pointer-events-none absolute rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${(primaryPoints[hoveredIdx].x / size) * 100}%`,
            top: `${(primaryPoints[hoveredIdx].y / size) * 100}%`,
            transform: "translate(10px, -100%)",
            zIndex: 10,
          }}
        >
          <div className="mb-1 font-semibold text-foreground">
            {axes[hoveredIdx].label}
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
            <span className="text-muted-foreground">{primaryLabel} :</span>
            <span className="font-semibold" style={{ color: primaryColor }}>
              {axes[hoveredIdx].score}%
            </span>
          </div>
          {overlayAxes && (
            <div className="mt-0.5 flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: overlayColor }}
              />
              <span className="text-muted-foreground">{overlayLabel} :</span>
              <span className="font-semibold" style={{ color: overlayColor }}>
                {overlayAxes[hoveredIdx].score}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
