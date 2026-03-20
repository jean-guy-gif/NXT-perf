"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { HumanScore } from "@/lib/scoring";

interface ScoreBadgeProps {
  score: HumanScore;
  showMarket?: boolean;
  showTrend?: boolean;
  size?: "sm" | "md";
}

export function ScoreBadge({ score, showMarket = false, showTrend = false, size = "sm" }: ScoreBadgeProps) {
  const TrendIcon = score.vsMarket === "above" ? TrendingUp
    : score.vsMarket === "below" ? TrendingDown
    : Minus;

  const trendColor = score.vsMarket === "above" ? "text-green-500"
    : score.vsMarket === "below" ? "text-red-500"
    : "text-muted-foreground";

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "rounded-full font-medium",
          score.bgColor,
          score.color,
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
        )}
      >
        {score.label}
      </span>
      {showTrend && (
        <TrendIcon className={cn("h-3.5 w-3.5", trendColor)} />
      )}
      {showMarket && score.marketAverage > 0 && (
        <span className="text-xs text-muted-foreground">
          Moy. marché : {Number.isInteger(score.marketAverage) ? score.marketAverage : score.marketAverage.toFixed(1)}{score.marketUnit === "%" ? "%" : ` ${score.marketUnit}`}
        </span>
      )}
    </div>
  );
}
