"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { CoachTargetType } from "@/types/coach";
import { cn } from "@/lib/utils";

/* ────── Config ────── */
const TYPE_CONFIG: Record<CoachTargetType, { label: string; className: string }> = {
  INSTITUTION: { label: "Institution", className: "bg-purple-500/10 text-purple-500" },
  MANAGER: { label: "Manager", className: "bg-blue-500/10 text-blue-500" },
  AGENT: { label: "Conseiller", className: "bg-green-500/10 text-green-500" },
};

/* ────── Props ────── */
interface TargetHeaderProps {
  targetType: CoachTargetType;
  targetName: string;
  backHref?: string;
}

/* ────── Component ────── */
export function TargetHeader({
  targetType,
  targetName,
  backHref = "/coach/dashboard",
}: TargetHeaderProps) {
  const { label, className: typeColorClass } = TYPE_CONFIG[targetType];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Link
        href={backHref}
        className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Tableau de bord
      </Link>
      <span className="text-muted-foreground">/</span>
      <span
        className={cn(
          "rounded-full px-2.5 py-0.5 text-xs font-medium",
          typeColorClass
        )}
      >
        {label}
      </span>
      <h1 className="text-xl font-bold tracking-tight">{targetName}</h1>
    </div>
  );
}
