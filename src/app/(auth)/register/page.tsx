"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
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
  const [inviteCode, setInviteCode] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError("Tous les champs sont obligatoires.");
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }

    const supabase = createClient();
    setLoading(true);

    const finalInviteCode = inviteCode.trim();

    // Manager must either provide an invite code or an org name
    if (role === "manager" && !finalInviteCode && !orgName.trim()) {
      setError("Renseignez un code d'invitation ou un nom d'organisation.");
      setLoading(false);
      return;
    }

    // Conseiller must provide an invite code
    if (role === "conseiller" && !finalInviteCode) {
      setError("Le code d'invitation est obligatoire.");
      setLoading(false);
      return;
    }

    // If joining with invite code, verify it exists
    if (finalInviteCode) {
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("invite_code", finalInviteCode)
        .single();

      if (!org) {
        setError("Code d'invitation invalide. Vérifiez avec votre manager.");
        setLoading(false);
        return;
      }
    }

    // Sign up with metadata (trigger will create profile + org if needed)
    const { data: signUpData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role,
          category,
          invite_code: finalInviteCode || undefined,
          org_name: (!finalInviteCode && orgName.trim()) ? orgName.trim() : undefined,
        },
      },
    });

    setLoading(false);

    if (authError) {
      if (authError.message.includes("already registered")) {
        setError("Cet email est déjà utilisé.");
      } else {
        setError(authError.message);
      }
      return;
    }

    if (!signUpData.session) {
      setError("Compte créé mais session non établie. Essayez de vous connecter.");
      router.push("/login");
      return;
    }

    // Full reload to ensure session cookies are sent
    window.location.href = "/dashboard";
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
            placeholder="Minimum 6 caractères"
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

        {role === "manager" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Nom de l&apos;organisation
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Ex: Start Academy, Mon Agence, etc."
              className={inputClassName}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Laissez vide si vous rejoignez une organisation existante avec un code
            </p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Code d&apos;invitation{" "}
            {role === "conseiller" && <span className="text-destructive">*</span>}
          </label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder={role === "manager" ? "Optionnel si vous créez une org" : "Ex: START-2026"}
            className={inputClassName}
            required={role === "conseiller"}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {role === "conseiller"
              ? "Demandez le code à votre manager"
              : "Renseignez un code si vous rejoignez une organisation existante"}
          </p>
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
          {loading ? "Création en cours..." : "Créer mon compte"}
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
