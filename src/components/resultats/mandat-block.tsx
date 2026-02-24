"use client";

import { cn } from "@/lib/utils";
import type { MandatEntry } from "@/types/results";

interface MandatBlockProps {
  mandat: MandatEntry;
}

export function MandatBlock({ mandat }: MandatBlockProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3">
      <p className="font-medium text-foreground">{mandat.nomVendeur}</p>
      <div className="mt-2">
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
            mandat.type === "exclusif"
              ? "bg-green-500/20 text-green-500"
              : "bg-yellow-500/20 text-yellow-500"
          )}
        >
          Mandat {mandat.type === "exclusif" ? "exclusif" : "simple"}
        </span>
      </div>
    </div>
  );
}
