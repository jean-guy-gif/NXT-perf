"use client";

import { useState } from "react";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { VocalFlow } from "./VocalFlow";
import type { PeriodResults } from "@/types/results";

interface VocalButtonProps {
  className?: string;
  onComplete?: (data: Partial<PeriodResults>) => void;
}

export function VocalButton({ className, onComplete }: VocalButtonProps) {
  const [showFlow, setShowFlow] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowFlow(true)}
        className={cn(
          "flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
          className
        )}
      >
        <Mic className="h-4 w-4" />
        Bilan vocal
      </button>
      {showFlow && (
        <VocalFlow
          onClose={() => setShowFlow(false)}
          onComplete={onComplete}
        />
      )}
    </>
  );
}
