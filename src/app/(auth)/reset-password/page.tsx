"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, RefreshCw, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { generateSecurePassword, getPasswordStrength } from "@/lib/password-utils";

export default function ResetPasswordPage() {
  const [password, setPassword]         = useState("");
  const [confirm, setConfirm]           = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [done, setDone]                 = useState(false);
  const router = useRouter();

  const strength = getPasswordStrength(password);

  const handleSuggest = () => {
    const pwd = generateSecurePassword();
    setPassword(pwd);
    setConfirm(pwd);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (strength.score < 2) {
      setError("Le mot de passe est trop faible. Ajoutez des chiffres ou des symboles.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  const inputClass =
    "h-10 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  const strengthBarClass = {
    red:   "bg-red-500",
    amber: "bg-amber-500",
    green: "bg-green-500",
  }[strength.color];

  const strengthTextClass = {
    red:   "text-red-500",
    amber: "text-amber-500",
    green: "text-green-600",
  }[strength.color];

  if (done) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <Check className="h-6 w-6 text-green-500" />
          </div>
        </div>
        <h1 className="mb-2 text-xl font-bold text-foreground">Mot de passe mis à jour</h1>
        <p className="text-sm text-muted-foreground">Redirection vers votre tableau de bord…</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="mb-6 flex justify-center">
        <img src="/logo-icon.svg" alt="NXT Perf" className="h-12 w-12" />
      </div>
      <h1 className="mb-2 text-center text-2xl font-bold text-foreground">Nouveau mot de passe</h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Choisissez un mot de passe sécurisé pour votre compte
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Mot de passe</label>
            <button
              type="button"
              onClick={handleSuggest}
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
              className={inputClass}
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
                      i <= strength.score ? strengthBarClass : "bg-border"
                    }`}
                  />
                ))}
              </div>
              <p className={`mt-1 text-xs ${strengthTextClass}`}>{strength.label}</p>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirm.length > 0 && password !== confirm && (
            <p className="mt-1 text-xs text-red-500">Les mots de passe ne correspondent pas</p>
          )}
          {confirm.length > 0 && password === confirm && (
            <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3 w-3" /> Correspondance confirmée
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || password !== confirm || strength.score < 2}
          className="h-10 w-full rounded-lg bg-primary font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Mise à jour…" : "Enregistrer le mot de passe"}
        </button>
      </form>
    </div>
  );
}
