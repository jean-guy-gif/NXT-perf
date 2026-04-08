"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target, ArrowRight } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingGpsPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const isDemo = useAppStore((s) => s.isDemo);

  const [caAnnuel, setCaAnnuel] = useState("");
  const [mandatsMois, setMandatsMois] = useState("");
  const [exclusivite, setExclusivite] = useState("");
  const [estimationsMois, setEstimationsMois] = useState("");
  const [visitesSemaine, setVisitesSemaine] = useState("");
  const [completing, setCompleting] = useState(false);

  const role = profile?.role ?? "conseiller";

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

  const handleComplete = async () => {
    setCompleting(true);
    if (!isDemo && user?.id) {
      const supabase = createClient();
      await supabase.from("profiles").update({
        onboarding_gps_completed: true,
        last_gps_date: new Date().toISOString().split("T")[0],
      }).eq("id", user.id);

      // Save objectives to store (localStorage via Zustand)
      if (caAnnuel) {
        useAppStore.getState().setAgencyObjective({
          annualCA: Number(caAnnuel) || 0,
          avgActValue: (Number(caAnnuel) || 0) / Math.max(1, (Number(mandatsMois) || 1) * 12),
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
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Target className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Ces objectifs alimenteront votre tableau de bord, {firstName}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              CA annuel cible (€)
            </label>
            <input
              type="number"
              value={caAnnuel}
              onChange={(e) => setCaAnnuel(e.target.value)}
              placeholder="Ex: 150000"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Mandats / mois
              </label>
              <input
                type="number"
                value={mandatsMois}
                onChange={(e) => setMandatsMois(e.target.value)}
                placeholder="Ex: 8"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                % Exclusivité cible
              </label>
              <input
                type="number"
                value={exclusivite}
                onChange={(e) => setExclusivite(e.target.value)}
                placeholder="Ex: 50"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Estimations / mois
              </label>
              <input
                type="number"
                value={estimationsMois}
                onChange={(e) => setEstimationsMois(e.target.value)}
                placeholder="Ex: 15"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Visites / semaine
              </label>
              <input
                type="number"
                value={visitesSemaine}
                onChange={(e) => setVisitesSemaine(e.target.value)}
                placeholder="Ex: 8"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleComplete}
            disabled={completing}
            className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <ArrowRight className="h-4 w-4" />
            Accéder à mon tableau de bord
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
