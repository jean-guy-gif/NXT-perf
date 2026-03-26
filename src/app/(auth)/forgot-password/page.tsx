"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/reset-password` }
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  };

  const inputClassName =
    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  if (sent) {
    return (
      <div className="rounded-xl border border-border bg-card p-8">
        <div className="mb-6 flex justify-center">
          <img src="/logo-icon.svg" alt="NXT Perf" className="h-12 w-12" />
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
          Email envoyé
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Consultez votre boîte mail ({email}) pour réinitialiser votre mot de passe.
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
        Mot de passe oublié
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Entrez votre email pour recevoir un lien de réinitialisation
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          disabled={loading}
          className="h-10 w-full rounded-lg bg-primary font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Envoi en cours..." : "Envoyer le lien"}
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
