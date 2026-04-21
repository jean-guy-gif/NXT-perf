"use client";

import { cn } from "@/lib/utils";

interface PeriodOption<T extends string> {
  value: T;
  label: string;
}

interface PeriodSelectorProps<T extends string> {
  options: PeriodOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function PeriodSelector<T extends string>({
  options,
  value,
  onChange,
  className,
}: PeriodSelectorProps<T>) {
  return (
    <div className={cn("flex gap-1 rounded-lg bg-muted p-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
