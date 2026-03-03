"use client";

import { ExternalLink, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MandatEntry } from "@/types/results";

interface MandatBlockProps {
  mandat: MandatEntry;
  onProfile?: () => void;
}

export function MandatBlock({ mandat, onProfile }: MandatBlockProps) {
  const isProfiled = mandat.profiled === true;

  const handleProfile = () => {
    onProfile?.();
    window.open("https://nxt-profiling.fr/profiling", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3">
      <p className="font-medium text-foreground">{mandat.nomVendeur}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
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
        {isProfiled ? (
          <a
            href="https://nxt-profiling.fr/profiling"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-violet-500/25 px-2.5 py-0.5 text-xs font-medium text-violet-600 transition-colors hover:bg-violet-500/35 dark:text-violet-400"
          >
            <Check className="h-3 w-3" />
            Déjà profilé
          </a>
        ) : (
          <button
            onClick={handleProfile}
            className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-medium text-violet-600 transition-colors hover:bg-violet-500/25 dark:text-violet-400"
          >
            <ExternalLink className="h-3 w-3" />
            Profiler
          </button>
        )}
      </div>
    </div>
  );
}
