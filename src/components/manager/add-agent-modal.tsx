"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import type { UserCategory } from "@/types/user";
import { CATEGORY_LABELS } from "@/lib/constants";

interface AddAgentModalProps {
  onClose: () => void;
  managerTeamId: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AddAgentModal({ onClose, managerTeamId }: AddAgentModalProps) {
  const addUser = useAppStore((s) => s.addUser);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<UserCategory>("confirme");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = "Le prénom est requis";
    if (!lastName.trim()) errs.lastName = "Le nom est requis";
    if (!email.trim()) {
      errs.email = "L'email est requis";
    } else if (!EMAIL_REGEX.test(email)) {
      errs.email = "Format d'email invalide";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    addUser({
      id: `u${Date.now()}`,
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: "conseiller",
      category,
      teamId: managerTeamId,
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
          {/* Prénom */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Prénom
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="Jean"
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-destructive">{errors.firstName}</p>
            )}
          </div>

          {/* Nom */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Nom
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="Dupont"
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-destructive">{errors.lastName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Email
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

          {/* Catégorie */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Catégorie
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
          </div>

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
