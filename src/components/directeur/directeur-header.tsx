"use client";

import { DirecteurBreadcrumb } from "@/components/directeur/breadcrumb";
import { ScopeSelector } from "@/components/directeur/scope-selector";
import { PeriodSelectorBar } from "@/components/directeur/period-selector-bar";

export function DirecteurHeader() {
  return (
    <div className="flex flex-col gap-2 border-b border-border bg-card/40 px-4 py-3">
      <DirecteurBreadcrumb />
      <ScopeSelector />
      <div className="flex items-center justify-end">
        <PeriodSelectorBar />
      </div>
    </div>
  );
}
