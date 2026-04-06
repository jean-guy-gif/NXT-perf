"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";

const FEATURES = [
  "Saisie hebdomadaire (vocal, manuel, import)",
  "Dashboard complet avec KPIs",
  "Debrief coaching personnalisé",
  "Import de vos données historiques",
  "Thème couleurs de votre agence",
  "Classements et export JPEG",
];

export default function SouscrirePage() {
  const user = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);
  const { isTrial, trialDaysLeft } = useSubscription();

  const [promoCode, setPromoCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleActivateTrial = async () => {
    setActivating(true);

    if (!isDemo && user?.id) {
      const supabase = createClient();
      await supabase.from("subscriptions").upsert({
        user_id: user.id,
        plan: "trial",
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString(),
        status: "active",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    }

    setActivating(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <Check className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Essai gratuit activé</h1>
          <p className="text-sm text-muted-foreground">
            30 jours d'accès complet — aucune carte requise.
          </p>
          <button
            type="button"
            onClick={() => window.location.href = "/dashboard"}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Accéder à mon dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Accès anticipé NXT Performance</h1>
          <p className="text-sm text-muted-foreground">
            Testez gratuitement pendant 30 jours — aucune carte requise
          </p>
        </div>

        <div className="rounded-2xl border-2 border-primary/30 bg-card p-6 space-y-5">
          <span className="inline-block rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold text-primary-foreground uppercase">
            Bêta
          </span>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground line-through">9€/mois</p>
            <p className="text-4xl font-bold text-green-500">GRATUIT</p>
            <p className="text-xs text-muted-foreground">pendant 30 jours — puis 9€/mois</p>
          </div>

          {isTrial && trialDaysLeft !== null && trialDaysLeft > 0 && (
            <p className="text-xs text-primary font-medium">
              Votre essai est actif — {trialDaysLeft} jour{trialDaysLeft > 1 ? "s" : ""} restant{trialDaysLeft > 1 ? "s" : ""}
            </p>
          )}

          <ul className="space-y-2 text-left">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <div>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Code partenaire (optionnel)"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-center outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="button"
            onClick={handleActivateTrial}
            disabled={activating}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Démarrer mon essai gratuit
          </button>
        </div>
      </div>
    </div>
  );
}
