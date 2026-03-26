import dynamic from "next/dynamic";

export const LineChart = dynamic(
  () => import("./line-chart").then((m) => m.LineChart),
  { ssr: false }
);

export const BarChart = dynamic(
  () => import("./bar-chart").then((m) => m.BarChart),
  { ssr: false }
);

export const DonutChart = dynamic(
  () => import("./donut-chart").then((m) => m.DonutChart),
  { ssr: false }
);

export const ComparisonBarChart = dynamic(
  () => import("./comparison-bar-chart").then((m) => m.ComparisonBarChart),
  { ssr: false }
);
