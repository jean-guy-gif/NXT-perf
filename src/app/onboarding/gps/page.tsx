"use client";

import { useState, useMemo } from "react";
import { Target, ArrowRight, ArrowDown, ClipboardCheck, FileSignature, Eye, FileText, Handshake, FileCheck } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";
import { calculateObjectiveBreakdown } from "@/lib/objectifs";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { UserCategory } from "@/types/user";

const funnelSteps = [
  { key: "estimationsNecessaires", label: "Estimations", icon: ClipboardCheck },
  { key: "mandatsNecessaires", label: "Mandats", icon: FileSignature },
  { key: "visitesNecessaires", label: "Visites", icon: Eye },
  { key: "offresNecessaires", label: "Offres", icon: FileText },
  { key: "compromisNecessaires", label: "Compromis", icon: Handshake },
  { key: "actesNecessaires", label: "Actes", icon: FileCheck },
] as const;

export default function OnboardingGpsPage() {
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const isDemo = useAppStore((s) => s.isDemo);

  const [caAnnuel, setCaAnnuel] = useState("");
  const [commissionMoyenne, setCommissionMoyenne] = useState("");
  const [completing, setCompleting] = useState(false);

  const role = profile?.role ?? "conseiller";
  const category: UserCategory = (user?.category as UserCategory) || "confirme";
  const categoryLabel = CATEGORY_LABELS[category] || "Confirmé";

  const title = role === "directeur"
    ? "Définissez les objectifs de votre agence"
    : role === "manager"
      ? "Définissez les objectifs de votre équipe"
      : "Définissez vos objectifs";

  const getRedirectUrl = () => {
    if (role === "manager") return "/onboarding/equipe";
    if (role === "directeur") return "/onboarding/agence";
    if (role === "coach") return "/onboarding/coach";
    return "/dashboard";
  };

  // Auto-calculate breakdown from CA + commission + profile ratios
  const ca = Number(caAnnuel) || 0;
  const commission = Number(commissionMoyenne) || 0;

  const breakdown = useMemo(() => {
    if (ca <= 0 || commission <= 0) return null;
    return calculateObjectiveBreakdown(ca, commission, category, ratioConfigs);
  }, [ca, commission, category, ratioConfigs]);

  const handleComplete = async () => {
    setCompleting(true);
    if (!isDemo && user?.id) {
      const supabase = createClient();
      await supabase.from("profiles").update({
        onboarding_gps_completed: true,
        last_gps_date: new Date().toISOString().split("T")[0],
      }).eq("id", user.id);

      if (breakdown && ca > 0) {
        const currentYear = new Date().getFullYear();
        await supabase.from("objectives").upsert({
          user_id: user.id,
          year: currentYear,
          input: { objectifFinancierAnnuel: ca },
          breakdown,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,year" });

        useAppStore.getState().setAgencyObjective({
          annualCA: ca,
          avgActValue: commission,
        });
      }
    }
    window.location.href = getRedirectUrl();
  };

  const handleSkip = () => {
    window.location.href = getRedirectUrl();
  };

  const firstName = user?.firstName || "Conseiller";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Target className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">
            2 informations suffisent pour calculer vos objectifs, {firstName}
          </p>
        </div>

        {/* Profile badge */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">Profil :</span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {categoryLabel}
          </span>
          <span className="text-xs text-muted-foreground">
            (ratios adaptés automatiquement)
          </span>
        </div>

        {/* 2 inputs only */}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Objectif CA annuel (€)
            </label>
            <input
              type="number"
              value={caAnnuel}
              onChange={(e) => setCaAnnuel(e.target.value)}
              placeholder="Ex: 150 000"
              min={0}
              step={1000}
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-lg font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Commission moyenne par acte (€)
            </label>
            <input
              type="number"
              value={commissionMoyenne}
              onChange={(e) => setCommissionMoyenne(e.target.value)}
              placeholder="Ex: 8 000"
              min={0}
              step={500}
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-lg font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Auto-calculated breakdown */}
        {breakdown && (
          <div className="space-y-3">
            <div className="flex items-center justify-center">
              <ArrowDown className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
              <p className="text-xs text-muted-foreground">Objectif CA Annuel</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(ca)}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {funnelSteps.map((step) => {
                const value = breakdown[step.key as keyof typeof breakdown];
                const Icon = step.icon;
                const monthly = Math.ceil(value / 12);

                return (
                  <div
                    key={step.key}
                    className="rounded-xl border border-border bg-card p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground">{step.label}</p>
                    </div>
                    <p className="mt-1 text-xl font-bold text-foreground">
                      {Math.round(value)}
                      <span className="text-xs font-normal text-muted-foreground">/an</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ~{monthly}/mois
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Exclusivity */}
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">% Exclusivité attendu</p>
              <p className="text-lg font-bold text-foreground">{breakdown.pourcentageExclusivite}%</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleComplete}
            disabled={completing}
            className={cn(
              "flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold transition-colors disabled:opacity-50",
              breakdown
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground"
            )}
          >
            <ArrowRight className="h-4 w-4" />
            {breakdown ? "Valider mes objectifs" : "Accéder à mon tableau de bord"}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-muted-foreground/70 transition-colors"
          >
            Passer cette étape
          </button>
        </div>
      </div>
    </div>
  );
}
