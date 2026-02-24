"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Maximize2 } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  status?: "ok" | "warning" | "danger";
  className?: string;
  onExpand?: () => void;
}

const statusIconBg = {
  ok: "bg-green-500/20",
  warning: "bg-orange-500/20",
  danger: "bg-red-500/20",
};

const statusIconColor = {
  ok: "text-green-500",
  warning: "text-orange-500",
  danger: "text-red-500",
};

export function KpiCard({
  title,
  value,
  trend,
  icon: Icon,
  iconColor,
  status = "ok",
  className,
  onExpand,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            statusIconBg[status]
          )}
        >
          <Icon
            className={cn("h-5 w-5", iconColor || statusIconColor[status])}
          />
        </div>
        <div className="flex items-center gap-2">
          {trend && (
            <span
              className={cn(
                "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
                trend.isPositive
                  ? "bg-green-500/10 text-green-500"
                  : "bg-red-500/10 text-red-500"
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
          )}
          {onExpand && (
            <button
              onClick={onExpand}
              className="text-muted-foreground transition-colors hover:text-primary"
              title="Voir la progression"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="mt-3">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
