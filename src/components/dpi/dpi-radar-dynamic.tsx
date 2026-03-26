import dynamic from "next/dynamic";

export const DPIRadar = dynamic(
  () => import("./dpi-radar").then((m) => m.DPIRadar),
  { ssr: false, loading: () => <div className="w-full h-[320px] animate-pulse rounded-lg bg-muted/30" /> }
);
