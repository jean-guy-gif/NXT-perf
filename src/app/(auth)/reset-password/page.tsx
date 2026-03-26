"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      if (updateError.message.includes("same_password")) {
        setError("Le nouveau mot de passe doit être différent de l'ancien.");
      } else {
        setError(updateError.message);
      }
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/login?reset=success");
    }, 2000);
  };

  const inputClassName =
    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  if (success) {
    return (
      <div className="rounded-xl border border-border bg-card p-8">
        <div className="mb-6 flex justify-center">
          <img src="/logo-icon.svg" alt="NXT Perf" className="h-12 w-12" />
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
          Mot de passe modifié
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Votre mot de passe a été modifié avec succès. Redirection vers la connexion...
        </p>
        <Link
          href="/login"
          className="block text-center text-sm text-primary hover:text-primary/80"
        >
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="mb-6 flex justify-center">
        <img src="/logo-icon.svg" alt="NXT Perf" className="h-12 w-12" />
      </div>
      <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
        Nouveau mot de passe
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Choisissez votre nouveau mot de passe
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClassName} pr-10`}
              placeholder="Minimum 6 caractères"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
              title={showPassword ? "Masquer" : "Afficher"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${inputClassName} pr-10`}
              placeholder="Retapez le mot de passe"
              required
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-10 w-full rounded-lg bg-primary font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Modification en cours..." : "Modifier le mot de passe"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:text-primary/80">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
