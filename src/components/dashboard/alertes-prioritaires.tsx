"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Info, XCircle } from "lucide-react";
import Link from "next/link";

interface PriorityAlert {
  id: string;
  type: "danger" | "warning" | "info";
  title: string;
  detail: string;
  conseillerName?: string;
  link?: string;
}

interface AlertesPrioritairesProps {
  alerts: PriorityAlert[];
  maxItems?: number;
}

const alertConfig = {
  danger: {
    icon: XCircle,
    border: "border-red-500/30",
    bg: "bg-red-500/5",
    iconColor: "text-red-500",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-orange-500/30",
    bg: "bg-orange-500/5",
    iconColor: "text-orange-500",
  },
  info: {
    icon: Info,
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    iconColor: "text-blue-500",
  },
} as const;

export function AlertesPrioritaires({ alerts, maxItems = 5 }: AlertesPrioritairesProps) {
  if (alerts.length === 0) return null;

  const items = alerts.slice(0, maxItems);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <h3 className="text-sm font-semibold text-foreground">Alertes prioritaires</h3>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
          {alerts.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((alert) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;

          const content = (
            <div
              className={cn(
                "rounded-xl border p-3 flex items-start gap-3",
                config.border,
                config.bg,
                alert.link && "cursor-pointer hover:shadow-sm transition-shadow"
              )}
            >
              <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.iconColor)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  {alert.conseillerName && (
                    <span className="text-xs text-muted-foreground">— {alert.conseillerName}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.detail}</p>
              </div>
            </div>
          );

          if (alert.link) {
            return (
              <Link key={alert.id} href={alert.link} className="block">
                {content}
              </Link>
            );
          }

          return <div key={alert.id}>{content}</div>;
        })}
      </div>
    </div>
  );
}
