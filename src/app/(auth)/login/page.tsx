"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";

export default function LoginPage() {
  const [email, setEmail] = useState("jean.dupont@antigravity.fr");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const login = useAppStore((s) => s.login);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const success = login(email, password);
    if (success) {
      router.push("/dashboard");
    } else {
      setError("Aucun compte trouvé avec cet email.");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="mb-6 flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
          <span className="text-lg font-bold text-primary-foreground">AG</span>
        </div>
      </div>
      <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
        Connexion
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Accédez à votre tableau de bord
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
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
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
          Se connecter
        </button>
      </form>

      <div className="mt-4 flex justify-between text-sm">
        <Link
          href="/forgot-password"
          className="text-muted-foreground hover:text-foreground"
        >
          Mot de passe oublié ?
        </Link>
        <Link
          href="/register"
          className="text-primary hover:text-primary/80"
        >
          Créer un compte
        </Link>
      </div>
    </div>
  );
}
