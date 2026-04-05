"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, ctaLabel, ctaHref, ctaAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--agency-primary,#6C5CE7)]/10 mb-5">
        <Icon className="h-8 w-8 text-[var(--agency-primary,#6C5CE7)]/50" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">{description}</p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && ctaAction && !ctaHref && (
        <button
          type="button"
          onClick={ctaAction}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
