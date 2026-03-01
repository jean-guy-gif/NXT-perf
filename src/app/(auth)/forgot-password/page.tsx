"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";

type Step = "email" | "reset";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const users = useAppStore((s) => s.users);
  const updateUserPassword = useAppStore((s) => s.updateUserPassword);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Veuillez saisir votre email.");
      return;
    }

    const found = users.find((u) => u.email === email.trim());
    if (!found) {
      setError("Aucun compte trouvé avec cet email.");
      return;
    }

    setStep("reset");
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPassword.trim()) {
      setError("Veuillez saisir un nouveau mot de passe.");
      return;
    }

    if (newPassword.length < 4) {
      setError("Le mot de passe doit contenir au moins 4 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    const success = updateUserPassword(email.trim(), newPassword);
    if (success) {
      router.push("/login?reset=success");
    } else {
      setError("Une erreur est survenue. Veuillez réessayer.");
    }
  };

  const inputClassName =
    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="mb-6 flex justify-center">
        <img src="/logo-icon.svg" alt="NXT Perf" className="h-12 w-12" />
      </div>
      <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
        Mot de passe oublié
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        {step === "email"
          ? "Saisissez votre email pour réinitialiser votre mot de passe"
          : "Choisissez un nouveau mot de passe"}
      </p>

      {step === "email" && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClassName}
              placeholder="votre@email.fr"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="h-10 w-full rounded-lg bg-primary font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Continuer
          </button>
        </form>
      )}

      {step === "reset" && (
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            Compte : <span className="font-medium text-foreground">{email}</span>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClassName}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClassName}
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="h-10 w-full rounded-lg bg-primary font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Réinitialiser le mot de passe
          </button>

          <button
            type="button"
            onClick={() => { setStep("email"); setError(""); }}
            className="h-10 w-full rounded-lg border border-input font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Retour
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:text-primary/80">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
