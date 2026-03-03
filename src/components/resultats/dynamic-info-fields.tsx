"use client";

import { useState } from "react";
import { Trash2, Handshake, XCircle, X, ExternalLink, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RemovalReason } from "@/stores/app-store";

interface InfoItem {
  id: string;
  nom: string;
  commentaire: string;
  profiled?: boolean;
}

interface DynamicInfoFieldsProps {
  items: InfoItem[];
  label: string;
  onRemove?: (itemId: string, reason: RemovalReason) => void;
  onProfile?: (itemId: string) => void;
}

export function DynamicInfoFields({
  items,
  label,
  onRemove,
  onProfile,
}: DynamicInfoFieldsProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (items.length === 0) return null;

  const handleRemove = (reason: RemovalReason) => {
    if (confirmingId && onRemove) {
      onRemove(confirmingId, reason);
      setConfirmingId(null);
    }
  };

  const handleProfile = (itemId: string) => {
    onProfile?.(itemId);
    window.open("https://nxt-profiling.fr/profiling", "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      <h4 className="mb-3 text-sm font-medium text-foreground">
        {label} ({items.length})
      </h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const isProfiled = item.profiled === true;

          return (
            <div key={item.id} className="relative">
              {/* Card */}
              <div
                className={cn(
                  "rounded-lg border border-border bg-muted/50 p-3 transition-colors",
                  confirmingId === item.id && "border-primary/40 bg-primary/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{item.nom}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.commentaire}
                    </p>
                  </div>
                  {onRemove && confirmingId !== item.id && (
                    <button
                      onClick={() => setConfirmingId(item.id)}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  {confirmingId === item.id && (
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title="Annuler"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Action buttons */}
                {confirmingId === item.id && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="mb-2 text-sm font-medium text-foreground">
                      Quelle est la raison ?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRemove("deale")}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-500/15 px-3 py-2.5 text-sm font-medium text-green-600 transition-colors hover:bg-green-500/25 dark:text-green-400"
                      >
                        <Handshake className="h-4 w-4" />
                        Dealé
                      </button>
                      <button
                        onClick={() => handleRemove("abandonne")}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500/15 px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/25 dark:text-red-400"
                      >
                        <XCircle className="h-4 w-4" />
                        Abandonné
                      </button>
                      {isProfiled ? (
                        <a
                          href="https://nxt-profiling.fr/profiling"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-500/25 px-3 py-2.5 text-sm font-medium text-violet-600 transition-colors hover:bg-violet-500/35 dark:text-violet-400"
                        >
                          <Check className="h-4 w-4" />
                          Déjà profilé
                        </a>
                      ) : (
                        <button
                          onClick={() => handleProfile(item.id)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-500/15 px-3 py-2.5 text-sm font-medium text-violet-600 transition-colors hover:bg-violet-500/25 dark:text-violet-400"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Profiler
                        </button>
                      )}
                    </div>
                    {!isProfiled && (
                      <p className="mt-2 text-center text-[11px] text-violet-500/70">
                        +34% transformation client avec NXT Profiling
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
