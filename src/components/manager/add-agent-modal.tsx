"use client";

import { useState } from "react";
import { X, Send, CheckCircle2, Copy, Check } from "lucide-react";
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
  const [sent, setSent] = useState(false);
  const [addedName, setAddedName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = "Le prénom est requis";
    if (!lastName.trim()) errs.lastName = "Le nom est requis";
    if (!email.trim()) {
      errs.email = "L'email est requis";
    } else if (!EMAIL_REGEX.test(email)) {
      errs.email = "Format d'email invalide";
    }
    if (!category) errs.category = "Le niveau est requis";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedEmail = email.trim();

    addUser({
      id: `u${Date.now()}`,
      email: trimmedEmail,
      password: "changeme",
      firstName: trimmedFirst,
      lastName: trimmedLast,
      role: "conseiller",
      category,
      teamId: managerTeamId,
      managerId,
      createdAt: new Date().toISOString(),
    });

    const code = `INV-${managerId}`;
    setInviteCode(code);
    setAddedName(`${trimmedFirst} ${trimmedLast}`);
    setSent(true);
  };

  const inputClassName =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (sent) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {addedName} ajouté(e) à l'équipe
            </h2>
            <p className="text-sm text-muted-foreground">
              Transmettez le code d'invitation ci-dessous à votre conseiller pour qu'il puisse créer son compte.
            </p>
            <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3">
              <code className="flex-1 text-center text-lg font-bold tracking-wider text-foreground">
                {inviteCode}
              </code>
              <button
                onClick={handleCopy}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="w-full rounded-lg bg-muted/50 px-4 py-3 text-left">
              <p className="mb-1.5 text-xs font-medium text-foreground">Instructions pour le conseiller :</p>
              <ol className="space-y-0.5 text-xs text-muted-foreground">
                <li>1. Se rendre sur l'application NXT-Perf</li>
                <li>2. Cliquer sur « Créer un compte »</li>
                <li>3. Choisir le rôle « Conseiller »</li>
                <li>4. Entrer le code d'invitation</li>
                <li>5. Compléter ses informations</li>
              </ol>
            </div>
            <button
              onClick={onClose}
              className="mt-2 rounded-lg bg-gradient-nxt px-6 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              Prénom <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClassName}
              placeholder="Jean"
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-destructive">{errors.firstName}</p>
            )}
          </div>

          {/* Nom */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Nom <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClassName}
              placeholder="Dupont"
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-destructive">{errors.lastName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Email <span className="text-destructive">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClassName}
              placeholder="jean.dupont@agence.fr"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Niveau */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Niveau <span className="text-destructive">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as UserCategory)}
              className={inputClassName}
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

          <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Un code d'invitation sera généré pour que le conseiller puisse créer son compte sur NXT-Perf.
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
              className="flex items-center gap-2 rounded-lg bg-gradient-nxt px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Send className="h-3.5 w-3.5" />
              Ajouter et inviter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
