"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import type { UserCategory } from "@/types/user";
import { CATEGORY_LABELS } from "@/lib/constants";

interface AddAgentModalProps {
  onClose: () => void;
  managerTeamId: string;
  managerId: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AddAgentModal({ onClose, managerTeamId, managerId }: AddAgentModalProps) {
  const addUser = useAppStore((s) => s.addUser);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<UserCategory>("confirme");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    // Only category is required
    if (!category) errs.category = "Le niveau est requis";
    // Email is optional but if provided must be valid
    if (email.trim() && !EMAIL_REGEX.test(email)) {
      errs.email = "Format d'email invalide";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Auto-generate email if not provided
    const generatedEmail = email.trim() || `agent-${Date.now()}@nxt-perf.local`;
    // Auto-generate name if not provided
    const finalFirstName = firstName.trim() || `Agent`;
    const finalLastName = lastName.trim() || `${Date.now()}`;

    addUser({
      id: `u${Date.now()}`,
      email: generatedEmail,
      firstName: finalFirstName,
      lastName: finalLastName,
      role: "conseiller",
      category,
      teamId: managerTeamId,
      managerId,
      createdAt: new Date().toISOString(),
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            Ajouter un conseiller
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Catégorie - Required */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Niveau de l'agent <span className="text-destructive">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as UserCategory)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              {(["debutant", "confirme", "expert"] as UserCategory[]).map(
                (cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                )
              )}
            </select>
            {errors.category && (
              <p className="mt-1 text-xs text-destructive">{errors.category}</p>
            )}
          </div>

          {/* Prénom - Optional */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Prénom <span className="text-xs text-muted-foreground">(optionnel)</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="Jean"
            />
          </div>

          {/* Nom - Optional */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Nom <span className="text-xs text-muted-foreground">(optionnel)</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="Dupont"
            />
          </div>

          {/* Email - Optional */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Email <span className="text-xs text-muted-foreground">(optionnel)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="jean.dupont@antigravity.fr"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            ℹ️ Seul le niveau est obligatoire. Les autres champs peuvent être complétés ultérieurement.
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-lg bg-gradient-nxt px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
