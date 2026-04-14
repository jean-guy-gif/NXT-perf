"use client";

import { cn } from "@/lib/utils";
import type { MandatEntry } from "@/types/results";

interface MandatBlockProps {
  mandat: MandatEntry;
  index: number;
}

export function MandatBlock({ mandat, index }: MandatBlockProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3">
      <p className="text-xs font-semibold text-muted-foreground">
        Mandat {index + 1}
      </p>
      <span
        className={cn(
          "mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
          mandat.type === "exclusif"
            ? "bg-emerald-500/20 text-emerald-600"
            : "bg-amber-500/20 text-amber-600",
        )}
      >
        {mandat.type === "exclusif" ? "Exclusif" : "Simple"}
      </span>
    </div>
  );
}
