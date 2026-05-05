"use client";

import { useState } from "react";
import { ArrowRight, Briefcase, Loader2, Wallet } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Onboarding "Statut + Honoraires" (chantier A.2).
 *
 * Position dans le tunnel : entre `/onboarding/dpi` et `/onboarding/gps`.
 * Capture deux axes contextuels nécessaires au scoring du diagnostic
 * (futur câblage matrice A.3) :
 *   - `agent_status` : statut juridique métier (salarié / agent commercial /
 *     mandataire). Persisté dans `profiles.agent_status` (text + CHECK,
 *     migration 034 appliquée prod).
 *   - `avg_commission_eur` : commission moyenne par acte. Persisté dans
 *     `objectives.input` jsonb (clé ajoutée — pas de migration de schéma).
 *
 * Étape skippable (V1) pour ne pas bloquer les profils existants au
 * prochain login. Les valeurs peuvent être modifiées plus tard via
 * `/parametres/profil`.
 */

type AgentStatus = "salarie" | "agent_commercial" | "mandataire";

const STATUSES: {
  id: AgentStatus;
  label: string;
  desc: string;
}[] = [
  {
    id: "salarie",
    label: "Salarié",
    desc: "Vous êtes employé d'une agence avec un contrat de travail.",
  },
  {
    id: "agent_commercial",
    label: "Agent commercial",
    desc: "Vous êtes indépendant rattaché à une agence (statut RSAC).",
  },
  {
    id: "mandataire",
    label: "Mandataire",
    desc: "Vous travaillez sous mandat (réseau de mandataires, indépendant).",
  },
];

const FALLBACK_COMMISSION = 8000;

export default function OnboardingStatutPage() {
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const isDemo = useAppStore((s) => s.isDemo);

  const [status, setStatus] = useState<AgentStatus | null>(
    (profile?.agent_status as AgentStatus | null) ?? null,
  );
  const [commission, setCommission] = useState<string>(
    String(FALLBACK_COMMISSION),
  );
  const [submitting, setSubmitting] = useState(false);

  const commissionNum = Number(commission) || 0;
  const canValidate = status !== null && commissionNum > 0;

  const handleNext = async () => {
    setSubmitting(true);
    try {
      if (!isDemo && user?.id && status) {
        const supabase = createClient();

        // 1. profiles.agent_status
        await supabase
          .from("profiles")
          .update({ agent_status: status })
          .eq("id", user.id);
        if (profile) setProfile({ ...profile, agent_status: status });

        // 2. objectives.input.avg_commission_eur — merge avec l'éventuel
        // existant (year courant) pour ne pas écraser un CA déjà saisi.
        const currentYear = new Date().getFullYear();
        const { data: existing } = await supabase
          .from("objectives")
          .select("input")
          .eq("user_id", user.id)
          .eq("year", currentYear)
          .single();
        const existingInput =
          (existing?.input as Record<string, unknown> | null) ?? {};
        const mergedInput = {
          ...existingInput,
          avg_commission_eur: commissionNum,
        };
        await supabase.from("objectives").upsert(
          {
            user_id: user.id,
            year: currentYear,
            input: mergedInput,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,year" },
        );

        // Hydrate Zustand pour cohérence immédiate (avant /onboarding/gps).
        const existingCa =
          typeof existingInput.objectifFinancierAnnuel === "number"
            ? (existingInput.objectifFinancierAnnuel as number)
            : 0;
        useAppStore.getState().setAgencyObjective({
          annualCA: existingCa,
          avgActValue: commissionNum,
        });
      }
    } catch {
      // Best-effort. On continue le tunnel même si Supabase fail.
    }
    window.location.href = "/onboarding/gps";
  };

  const handleSkip = () => {
    window.location.href = "/onboarding/gps";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8">
        <header className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Briefcase className="h-3.5 w-3.5" />
            Statut et honoraires
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Votre situation professionnelle
          </h1>
          <p className="mt-3 text-muted-foreground">
            Deux infos pour adapter votre diagnostic à votre réalité.
          </p>
        </header>

        {/* Section 1 — Statut */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            Quel est votre statut ?
          </h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatus(s.id)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all",
                  status === s.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card/50 hover:border-primary/30 hover:bg-primary/5",
                )}
              >
                <span className="text-sm font-semibold text-foreground">
                  {s.label}
                </span>
                <span className="text-xs leading-snug text-muted-foreground">
                  {s.desc}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Section 2 — Honoraires moyens */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            <span className="inline-flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Honoraires moyens par acte
            </span>
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Commission moyenne brute que vous touchez par vente signée. Sert
            à chiffrer le manque à gagner dans votre diagnostic.
          </p>
          <div className="relative">
            <input
              type="number"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              min={0}
              step={500}
              className="h-12 w-full rounded-xl border border-input bg-background px-4 pr-12 text-lg font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              €
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Vous pourrez ajuster ce montant à l&apos;étape suivante.
          </p>
        </section>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleNext}
            disabled={!canValidate || submitting}
            className={cn(
              "inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50",
            )}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Continuer
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Passer cette étape
          </button>
        </div>
      </div>
    </div>
  );
}
