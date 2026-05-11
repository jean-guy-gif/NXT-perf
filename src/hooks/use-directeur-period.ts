"use client";

import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type DirecteurPeriod = "week" | "month" | "year";

const DEFAULT_PERIOD: DirecteurPeriod = "month";

export interface UseDirecteurPeriodReturn {
  period: DirecteurPeriod;
  setPeriod: (next: DirecteurPeriod) => void;
}

export function useDirecteurPeriod(): UseDirecteurPeriodReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get("period");
  const period: DirecteurPeriod =
    raw === "week" || raw === "year" || raw === "month" ? raw : DEFAULT_PERIOD;

  const setPeriod = useCallback(
    (next: DirecteurPeriod) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === DEFAULT_PERIOD) params.delete("period");
      else params.set("period", next);
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return { period, setPeriod };
}
