"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { UserRole, UserCategory, ProfileType } from "@/types/user";
import type { DbProfile } from "@/types/database";
import { useAppStore } from "@/stores/app-store";
import { CATEGORY_LABELS } from "@/lib/constants";
import { Check, Eye, EyeOff, RefreshCw } from "lucide-react";
import { generateSecurePassword, getPasswordStrength } from "@/lib/password-utils";

const ROLE_LABELS: Record<UserRole, string> = {
  conseiller: "Conseiller",
  manager: "Manager",
  directeur: "Directeur",
  coach: "Coach",
  reseau: "Réseau",
};

/** Default role pre-selection based on profile type from /welcome */
function defaultRolesForProfile(profile: ProfileType | null): UserRole[] {
  switch (profile) {
    case "INSTITUTION":
      return ["directeur", "manager"];
    case "MANAGER":
      return ["manager"];
    case "AGENT":
      return ["conseiller"];
    case "COACH":
      return ["coach"];
    default:
      return ["conseiller"];
  }
}

/** Pick highest priority role as the primary/active role */
function primaryRole(roles: UserRole[]): UserRole {
  if (roles.includes("directeur")) return "directeur";
  if (roles.includes("manager")) return "manager";
  if (roles.includes("coach")) return "coach";
  return "conseiller";
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") ?? "";
  const profileParam = (searchParams.get("profile") ?? null) as ProfileType | null;

  // Legacy support: ?role= still works
  const legacyRole = searchParams.get("role");
  const derivedProfile: ProfileType | null = profileParam
    ?? (legacyRole === "manager" ? "MANAGER" : legacyRole === "conseiller" ? "AGENT" : null);

  const roleLocked = !!initialCode;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(
    roleLocked ? ["conseiller"] : defaultRolesForProfile(derivedProfile)
  );
  const [category, setCategory] = useState<UserCategory>("confirme");
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [orgName, setOrgName] = useState("");
  const [managerMode, setManagerMode] = useState<"create" | "join">(initialCode ? "join" : "create");
  const [showPassword, setShowPassword] = useState(false);
  const strength = getPasswordStrength(password);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteCodeStatus, setInviteCodeStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [validatedOrgName, setValidatedOrgName] = useState("");
  const router = useRouter();

  const toggleRole = (role: UserRole) => {
    if (roleLocked) return;
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        // Don't allow empty selection
        if (prev.length === 1) return prev;
        return prev.filter((r) => r !== role);
      }
      return [...prev, role];
    });
  };

  const isManager = selectedRoles.includes("manager") || selectedRoles.includes("directeur");
  const isConseillerOnly = selectedRoles.includes("conseiller") && !isManager;
  const mainRole = primaryRole(selectedRoles);

  const validateInviteCode = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      setInviteCodeStatus("idle");
      setValidatedOrgName("");
      return;
    }
    setInviteCodeStatus("checking");
    const supabase = createClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("invite_code", trimmed)
      .single();
    if (org) {
      setInviteCodeStatus("valid");
      setValidatedOrgName(org.name);
    } else {
      setInviteCodeStatus("invalid");
      setValidatedOrgName("");
    }
  }, []);

  // Auto-validate when code comes from URL
  useEffect(() => {
    if (initialCode) {
      validateInviteCode(initialCode);
    }
  }, [initialCode, validateInviteCode]);

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

    // If joining with invite code, verify it exists (skip if already validated)
    if (finalInviteCode) {
      if (inviteCodeStatus === "invalid") {
        setError("Code d'invitation invalide. Vérifiez avec votre manager.");
        setLoading(false);
        return;
      }
      if (inviteCodeStatus !== "valid") {
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
    }

    // Compute context_mode (simple & robust)
    const isCoachOnly = selectedRoles.every((r) => r === "coach");
    const contextMode: "invite" | "personal" = finalInviteCode ? "invite" : "personal";
    const coachStandalone = !finalInviteCode && isCoachOnly;

    // Sign up with metadata (trigger will create profile + org if needed)
    const { data: signUpData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          main_role: mainRole,
          selected_roles: selectedRoles,
          category,
          context_mode: contextMode,
          invite_code: finalInviteCode || null,
          org_name: orgName.trim() || null,
          coach_standalone: coachStandalone,
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

    // Supabase returns a user with empty identities if email already exists
    if (signUpData.user && signUpData.user.identities?.length === 0) {
      setError("Un compte avec cet email existe déjà.");
      return;
    }

    if (!signUpData.session || !signUpData.user) {
      setError("Compte créé mais session non établie. Essayez de vous connecter.");
      router.push("/login");
      return;
    }

    // Pre-load profile in store so dashboard layout skips the async fetch
    const optimisticProfile: DbProfile = {
      id: signUpData.user.id,
      org_id: "", // will be set by trigger — not needed for initial render
      team_id: null,
      email: email.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      role: mainRole,
      available_roles: selectedRoles,
      category,
      avatar_url: null,
      onboarding_status: "DONE",
      profile_type: derivedProfile,
      sub_profile: null,
      coach_code: null,
      onboarding_completed: false,
      last_voice_saisie_date: null,
      agency_logo_url: null,
      agency_primary_color: null,
      agency_secondary_color: null,
      coach_voice: "bienveillant",
      created_at: new Date().toISOString(),
    };
    useAppStore.getState().setProfile(optimisticProfile);

    // Wait 1s for trigger to create the real profile, then redirect to onboarding
    await new Promise((r) => setTimeout(r, 1000));
    window.location.href = "/onboarding/identite";
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
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Mot de passe</label>
            <button
              type="button"
              onClick={() => {
                const pwd = generateSecurePassword();
                setPassword(pwd);
                setShowPassword(true);
              }}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Suggérer un mot de passe
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="Minimum 8 caractères"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= strength.score
                        ? strength.color === "red"   ? "bg-red-500"
                        : strength.color === "amber" ? "bg-amber-500"
                        : "bg-green-500"
                        : "bg-border"
                    }`}
                  />
                ))}
              </div>
              <p className={`mt-1 text-xs ${
                strength.color === "red"   ? "text-red-500"   :
                strength.color === "amber" ? "text-amber-500" : "text-green-600"
              }`}>{strength.label}</p>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Rôle(s)
          </label>
          {roleLocked ? (
            <>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg border border-primary bg-primary/10 px-3 py-2 text-center text-sm font-medium text-primary">
                  Conseiller
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Vous rejoignez une équipe existante en tant que conseiller.
              </p>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {(["conseiller", "manager", "directeur", "coach"] as UserRole[]).map((r) => {
                  const selected = selectedRoles.includes(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => toggleRole(r)}
                      className={`relative flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                      {ROLE_LABELS[r]}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Sélectionnez un ou plusieurs rôles. Vous aurez accès aux vues correspondantes.
              </p>
            </>
          )}
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

        {isManager && !roleLocked && (
          <div className="space-y-3">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Organisation
            </label>
            <div className="flex gap-2 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => { setManagerMode("create"); setInviteCode(""); setInviteCodeStatus("idle"); setValidatedOrgName(""); }}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  managerMode === "create"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Créer une organisation
              </button>
              <button
                type="button"
                onClick={() => { setManagerMode("join"); setOrgName(""); setInviteCodeStatus("idle"); setValidatedOrgName(""); }}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  managerMode === "join"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Rejoindre avec un code
              </button>
            </div>

            {managerMode === "create" ? (
              <div>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Ex: Start Academy, Mon Agence, etc."
                  className={inputClassName}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Un code d&apos;invitation sera généré automatiquement
                </p>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => { setInviteCode(e.target.value); setInviteCodeStatus("idle"); setValidatedOrgName(""); }}
                  onBlur={() => validateInviteCode(inviteCode)}
                  placeholder="Ex: AG-1234"
                  className={inputClassName}
                />
                <InviteCodeFeedback status={inviteCodeStatus} orgName={validatedOrgName} />
              </div>
            )}
          </div>
        )}

        {isConseillerOnly && !roleLocked && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Code d&apos;invitation{" "}
              <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => { setInviteCode(e.target.value); setInviteCodeStatus("idle"); setValidatedOrgName(""); }}
              onBlur={() => validateInviteCode(inviteCode)}
              placeholder="Ex: MG-1234"
              className={inputClassName}
            />
            <InviteCodeFeedback status={inviteCodeStatus} orgName={validatedOrgName} />
            <p className="mt-1 text-xs text-muted-foreground">
              Sans code, un espace personnel sera créé.
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

/* ────── Invite Code Feedback Component ────── */
function InviteCodeFeedback({
  status,
  orgName,
}: {
  status: "idle" | "checking" | "valid" | "invalid";
  orgName: string;
}) {
  if (status === "idle") return null;

  if (status === "checking") {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Vérification...
      </p>
    );
  }

  if (status === "valid") {
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs text-green-600">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Code valide — Organisation : {orgName}
      </p>
    );
  }

  return (
    <p className="mt-1 flex items-center gap-1.5 text-xs text-destructive">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
      Code invalide
    </p>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
