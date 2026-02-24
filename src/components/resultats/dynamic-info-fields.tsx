"use client";

import { useState } from "react";
import { Trash2, Handshake, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RemovalReason } from "@/stores/app-store";

interface InfoItem {
  id: string;
  nom: string;
  commentaire: string;
}

interface DynamicInfoFieldsProps {
  items: InfoItem[];
  label: string;
  onRemove?: (itemId: string, reason: RemovalReason) => void;
}

export function DynamicInfoFields({
  items,
  label,
  onRemove,
}: DynamicInfoFieldsProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (items.length === 0) return null;

  const handleRemove = (reason: RemovalReason) => {
    if (confirmingId && onRemove) {
      onRemove(confirmingId, reason);
      setConfirmingId(null);
    }
  };

  return (
    <div>
      <h4 className="mb-3 text-sm font-medium text-foreground">
        {label} ({items.length})
      </h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
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

              {/* Confirmation inline */}
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
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
