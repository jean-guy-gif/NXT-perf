"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  current: number;
  previous: number;
  format?: "number" | "percent" | "currency";
  invertColor?: boolean;
}

export function TrendIndicator({ current, previous, invertColor = false }: TrendIndicatorProps) {
  if (previous === 0) return null;

  const delta = current - previous;
  const deltaPct = Math.round((delta / previous) * 100);

  if (deltaPct === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        Stable
      </span>
    );
  }

  const isPositive = invertColor ? deltaPct < 0 : deltaPct > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        isPositive ? "text-green-500" : "text-red-500"
      )}
    >
      {deltaPct > 0 ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {deltaPct > 0 ? "+" : ""}{deltaPct}%
    </span>
  );
}
