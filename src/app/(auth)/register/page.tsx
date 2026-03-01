"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import type { UserRole, UserCategory } from "@/types/user";
import { CATEGORY_LABELS } from "@/lib/constants";

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get("role") === "manager" ? "manager" : "conseiller") as UserRole;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(initialRole);
  const [category, setCategory] = useState<UserCategory>("confirme");
  const [invitationCode, setInvitationCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const register = useAppStore((s) => s.register);
  const users = useAppStore((s) => s.users);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError("Tous les champs sont obligatoires.");
      return;
    }

    if (users.some((u) => u.email === email.trim())) {
      setError("Cet email est déjà utilisé.");
      return;
    }

    let managerId: string | undefined;
    let teamId = `team-${Date.now()}`;

    if (role === "conseiller") {
      if (!invitationCode.trim()) {
        setError("Le code d'invitation est obligatoire pour un conseiller.");
        return;
      }
      const codeMatch = invitationCode.trim().match(/^INV-(.+)$/i);
      if (!codeMatch) {
        setError("Format de code invalide. Attendu : INV-xxx (ex: INV-m1708932345123)");
        return;
      }
      const targetManagerId = codeMatch[1];
      const manager = users.find(
        (u) => u.id === targetManagerId && u.role === "manager"
      );
      if (!manager) {
        setError("Ce code d'invitation n'existe pas ou le manager n'a pas été trouvé. Vérifiez le code avec votre manager.");
        return;
      }
      managerId = manager.id;
      teamId = manager.teamId;
    }

    register({
      id: `${role === "manager" ? "m" : "u"}${Date.now()}`,
      email: email.trim(),
      password: password,
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
        <img src="/logo-icon.svg" alt="NXT Perf" className="h-12 w-12" />
      </div>
      <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
        Créer un compte
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Rejoignez NXT-Perf
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        {role === "conseiller" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Code d&apos;invitation <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              placeholder="INV-m1234567890"
              className={inputClassName}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Demandez le code d&apos;invitation complet à votre manager (visible dans son espace équipe)
            </p>
          </div>
        )}

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

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
