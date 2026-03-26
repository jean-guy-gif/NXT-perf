import dynamic from "next/dynamic";

export const DPIRadar = dynamic(
  () => import("./dpi-radar").then((m) => m.DPIRadar),
  { ssr: false }
);
