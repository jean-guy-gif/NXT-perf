"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import type { UserRole, UserCategory } from "@/types/user";
import { CATEGORY_LABELS } from "@/lib/constants";

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("conseiller");
  const [category, setCategory] = useState<UserCategory>("confirme");
  const [invitationCode, setInvitationCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const register = useAppStore((s) => s.register);
  const users = useAppStore((s) => s.users);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Vérifier si l'email est déjà utilisé
    if (users.some((u) => u.email === email.trim())) {
      setError("Cet email est déjà utilisé.");
      return;
    }

    let managerId: string | undefined;
    let teamId = `team-${Date.now()}`;

    if (role === "conseiller") {
      // Valider le code d'invitation
      const codeMatch = invitationCode.trim().match(/^INV-(.+)$/i);
      if (!codeMatch) {
        setError("Code d'invitation invalide. Format attendu : INV-xxx");
        return;
      }
      const targetManagerId = codeMatch[1];
      const manager = users.find(
        (u) => u.id === targetManagerId && u.role === "manager"
      );
      if (!manager) {
        setError("Code d'invitation invalide. Manager introuvable.");
        return;
      }
      managerId = manager.id;
      teamId = manager.teamId;
    }

    register({
      id: `u${Date.now()}`,
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      category,
      teamId,
      managerId,
      createdAt: new Date().toISOString(),
    });

    router.push("/dashboard");
  };

  const inputClassName =
    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="mb-6 flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
          <span className="text-lg font-bold text-primary-foreground">AG</span>
        </div>
      </div>
      <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
        Créer un compte
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Rejoignez Antigravity Dashboard
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Prénom / Nom */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Prénom
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClassName}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Nom
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClassName}
              required
            />
          </div>
        </div>

        {/* Email */}
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

        {/* Mot de passe */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
            required
          />
        </div>

        {/* Rôle */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Rôle
          </label>
          <div className="flex gap-3">
            {(["conseiller", "manager"] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  role === r
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {r === "conseiller" ? "Conseiller" : "Manager"}
              </button>
            ))}
          </div>
        </div>

        {/* Catégorie */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Catégorie
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

        {/* Code d'invitation (conseillers uniquement) */}
        {role === "conseiller" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Code d&apos;invitation
            </label>
            <input
              type="text"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              placeholder="INV-m1"
              className={inputClassName}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Demandez le code à votre manager
            </p>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="h-10 w-full rounded-lg bg-primary font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Créer mon compte
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-primary hover:text-primary/80">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
