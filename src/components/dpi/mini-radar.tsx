"use client";

interface MiniRadarProps {
  scores: Array<{ label: string; score: number }>;
  color?: string;
  size?: number;
  showLabels?: boolean;
}

function polarToXY(cx: number, cy: number, r: number, index: number, total: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function radarPath(scores: number[], cx: number, cy: number, r: number): string {
  const n = scores.length;
  return scores.map((score, i) => {
    const { x, y } = polarToXY(cx, cy, (score / 100) * r, i, n);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z";
}

function gridPath(level: number, n: number, cx: number, cy: number, r: number): string {
  return Array.from({ length: n }, (_, i) => {
    const { x, y } = polarToXY(cx, cy, (level / 100) * r, i, n);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z";
}

export function MiniRadar({ scores, color = "#6366f1", size = 120, showLabels = false }: MiniRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const labelMargin = showLabels ? 24 : 6;
  const r = size / 2 - labelMargin;
  const n = scores.length;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[25, 50, 75, 100].map((level) => (
        <path key={level} d={gridPath(level, n, cx, cy, r)}
          fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={0.5} />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const { x, y } = polarToXY(cx, cy, r, i, n);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y}
          stroke="currentColor" strokeOpacity={0.15} strokeWidth={0.5} />;
      })}
      <path d={radarPath(scores.map((s) => s.score), cx, cy, r)}
        fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.5} />
      {showLabels && scores.map((s, i) => {
        const { x, y } = polarToXY(cx, cy, r + 14, i, n);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize={8} fill="currentColor" opacity={0.5}>
            {s.label.length > 8 ? s.label.slice(0, 7) + "…" : s.label}
          </text>
        );
      })}
    </svg>
  );
}
