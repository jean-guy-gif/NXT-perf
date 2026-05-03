"use client";

import { ArrowLeft, ChevronDown, User as UserIcon, Users } from "lucide-react";
import { useManagerView } from "@/hooks/use-manager-view";
import { UserAvatar } from "@/components/ui/user-avatar";
import { CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ManagerViewSwitcherProps {
  className?: string;
}

/**
 * V3 Manager view switcher (PR3.8.2).
 *
 * Renders the toggle Collectif / Individuel and (in individual mode) the
 * advisor selector + breadcrumb "Vue individuelle de Prénom Nom" with a
 * "Retour à l'équipe" button.
 *
 * State is held in the persisted Zustand store via `useManagerView`, so the
 * mode and selected advisor stay coherent across the 4 Manager V3 pages.
 *
 * The component renders nothing if the current user has no advisors at all
 * (e.g. empty team in prod) — pages handle empty states themselves.
 */
export function ManagerViewSwitcher({ className }: ManagerViewSwitcherProps) {
  const {
    mode,
    advisors,
    selectedAdvisor,
    selectedAdvisorId,
    setMode,
    selectAdvisor,
    backToCollective,
  } = useManagerView();

  if (advisors.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toggle Collectif / Individuel */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Vue Manager"
          className="inline-flex gap-1 rounded-lg bg-muted p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "collective"}
            onClick={() => setMode("collective")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "collective"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Users className="h-4 w-4" />
            Collectif (équipe)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "individual"}
            onClick={() => setMode("individual")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === "individual"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <UserIcon className="h-4 w-4" />
            Individuel
          </button>
        </div>

        {mode === "individual" && (
          <AdvisorSelector
            advisors={advisors}
            selectedId={selectedAdvisorId}
            onSelect={selectAdvisor}
          />
        )}
      </div>

      {/* Breadcrumb individuel */}
      {mode === "individual" && selectedAdvisor && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          <div className="flex items-center gap-2 text-foreground">
            <UserAvatar
              src={selectedAdvisor.avatarUrl}
              name={`${selectedAdvisor.firstName} ${selectedAdvisor.lastName}`}
              size="xs"
            />
            <span>
              Vue individuelle de{" "}
              <span className="font-semibold">
                {selectedAdvisor.firstName} {selectedAdvisor.lastName}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={backToCollective}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à l&apos;équipe
          </button>
        </div>
      )}
    </div>
  );
}

interface AdvisorSelectorProps {
  advisors: ReturnType<typeof useManagerView>["advisors"];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function AdvisorSelector({ advisors, selectedId, onSelect }: AdvisorSelectorProps) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={selectedId ?? ""}
        onChange={(e) => onSelect(e.target.value)}
        className="appearance-none rounded-md border border-input bg-background py-1.5 pl-3 pr-8 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        aria-label="Sélectionner un conseiller"
      >
        {advisors.map((a) => {
          const level = CATEGORY_LABELS[a.category] ?? a.category;
          return (
            <option key={a.id} value={a.id}>
              {a.firstName} {a.lastName} — {level}
            </option>
          );
        })}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-4 w-4 text-muted-foreground" />
    </div>
  );
}
