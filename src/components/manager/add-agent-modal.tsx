"use client";

import { useState, useCallback } from "react";
import {
  X,
  Send,
  CheckCircle2,
  Copy,
  Check,
  Mail,
  MessageCircle,
  Link2,
  ClipboardCopy,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import type { UserCategory } from "@/types/user";
import { CATEGORY_LABELS } from "@/lib/constants";
import {
  buildInviteLink,
  buildMailtoUrl,
  buildWhatsappUrl,
  buildInviteMessage,
} from "@/lib/invite";
import { cn } from "@/lib/utils";

interface AddAgentModalProps {
  onClose: () => void;
  managerTeamId: string;
  managerId: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CopiedKey = "code" | "link" | "message" | null;

export function AddAgentModal({
  onClose,
  managerTeamId,
  managerId,
}: AddAgentModalProps) {
  const addUser = useAppStore((s) => s.addUser);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<UserCategory>("confirme");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Success state
  const [sent, setSent] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [addedEmail, setAddedEmail] = useState("");
  const [addedCategory, setAddedCategory] = useState<UserCategory>("confirme");
  const [copied, setCopied] = useState<CopiedKey>(null);

  const validate = () => {
    const errs: Record<string, string> = {};
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

    const trimmedEmail = email.trim();
    const trimmedFirst = firstName.trim() || trimmedEmail.split("@")[0];
    const trimmedLast = lastName.trim();

    addUser({
      id: `u${Date.now()}`,
      email: trimmedEmail,
      password: "changeme",
      firstName: trimmedFirst,
      lastName: trimmedLast,
      role: "conseiller",
      availableRoles: ["conseiller"],
      category,
      teamId: managerTeamId,
      managerId,
      createdAt: new Date().toISOString(),
    });

    const code = `INV-${managerId}`;
    const link = buildInviteLink(code);
    setInviteCode(code);
    setInviteLink(link);
    setAddedEmail(trimmedEmail);
    setAddedCategory(category);
    setSent(true);
  };

  const handleCopy = useCallback(
    async (key: CopiedKey, text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
      } catch {
        // Clipboard API not available
      }
    },
    []
  );

  const handleMailto = useCallback(() => {
    window.location.href = buildMailtoUrl(inviteCode, inviteLink, addedCategory);
  }, [inviteCode, inviteLink, addedCategory]);

  const handleWhatsApp = useCallback(() => {
    window.open(
      buildWhatsappUrl(inviteCode, inviteLink, addedCategory),
      "_blank",
      "noopener,noreferrer"
    );
  }, [inviteCode, inviteLink, addedCategory]);

  const handleCopyMessage = useCallback(() => {
    const msg = buildInviteMessage(inviteCode, inviteLink, addedCategory);
    handleCopy("message", msg);
  }, [inviteCode, inviteLink, addedCategory, handleCopy]);

  const inputClassName =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  // ─── Success screen ──────────────────────────────────────────────

  if (sent) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border border-border bg-card shadow-xl">
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Header */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Invitation créée
              </h2>
            </div>

            {/* Info summary */}
            <div className="mt-5 space-y-2 rounded-lg border border-border bg-muted/30 p-4">
              <InfoRow label="Email" value={addedEmail} />
              <InfoRow label="Niveau" value={CATEGORY_LABELS[addedCategory]} />
            </div>

            {/* Code */}
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Code d&apos;invitation
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3">
                <code className="flex-1 text-center text-lg font-bold tracking-wider text-foreground">
                  {inviteCode}
                </code>
                <CopyButton
                  active={copied === "code"}
                  onClick={() => handleCopy("code", inviteCode)}
                />
              </div>
            </div>

            {/* Link */}
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Lien d&apos;inscription
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3">
                <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm text-foreground">
                  {inviteLink}
                </span>
                <CopyButton
                  active={copied === "link"}
                  onClick={() => handleCopy("link", inviteLink)}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-5 space-y-2.5">
              <p className="text-xs font-medium text-muted-foreground">
                Envoyer l&apos;invitation
              </p>

              <button
                onClick={handleMailto}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Mail className="h-4 w-4 text-blue-500" />
                Préparer un mail
              </button>

              <button
                onClick={handleWhatsApp}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <MessageCircle className="h-4 w-4 text-green-500" />
                Envoyer par WhatsApp
              </button>

              <button
                onClick={handleCopyMessage}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {copied === "message" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <ClipboardCopy className="h-4 w-4 text-muted-foreground" />
                )}
                {copied === "message" ? "Copié !" : "Copier le message"}
              </button>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 border-t border-border px-6 py-4">
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-gradient-nxt px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Form screen ─────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border border-border bg-card shadow-xl">
        <div className="flex-1 overflow-y-auto p-6">
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

          <form id="add-agent-form" onSubmit={handleSubmit} className="space-y-4">
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

            {/* Prénom (optionnel) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Prénom{" "}
                <span className="text-xs text-muted-foreground">(optionnel)</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClassName}
                placeholder="Jean"
              />
            </div>

            {/* Nom (optionnel) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Nom{" "}
                <span className="text-xs text-muted-foreground">(optionnel)</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClassName}
                placeholder="Dupont"
              />
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
              Un code d&apos;invitation sera généré pour que le conseiller puisse créer son compte.
            </p>
          </form>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-border px-6 py-4">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Annuler
            </button>
            <button
              type="submit"
              form="add-agent-form"
              className="flex items-center gap-2 rounded-lg bg-gradient-nxt px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Send className="h-3.5 w-3.5" />
              Ajouter et inviter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function CopyButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {active ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
