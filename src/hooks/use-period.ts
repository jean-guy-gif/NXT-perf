"use client";

import { useState } from "react";
import type { PeriodSelection } from "@/types/period";

export function usePeriod() {
  const now = new Date();
  const [period, setPeriod] = useState<PeriodSelection>({
    type: "month",
    start: new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0],
    end: now.toISOString().split("T")[0],
  });

  return { period, setPeriod };
}
