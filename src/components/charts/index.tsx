import dynamic from "next/dynamic";

export const LineChart = dynamic(
  () => import("./line-chart").then((m) => m.LineChart),
  { ssr: false, loading: () => <div className="w-full h-[260px] animate-pulse rounded-lg bg-muted/30" /> }
);

export const BarChart = dynamic(
  () => import("./bar-chart").then((m) => m.BarChart),
  { ssr: false, loading: () => <div className="w-full h-[260px] animate-pulse rounded-lg bg-muted/30" /> }
);

export const DonutChart = dynamic(
  () => import("./donut-chart").then((m) => m.DonutChart),
  { ssr: false, loading: () => <div className="w-full h-[200px] animate-pulse rounded-lg bg-muted/30" /> }
);

export const ComparisonBarChart = dynamic(
  () => import("./comparison-bar-chart").then((m) => m.ComparisonBarChart),
  { ssr: false, loading: () => <div className="w-full h-[300px] animate-pulse rounded-lg bg-muted/30" /> }
);
