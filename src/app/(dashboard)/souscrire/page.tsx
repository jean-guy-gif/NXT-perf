"use client";

import { useState } from "react";
import { Check, CreditCard, Loader2, Users, Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

type PlanId = "solo" | "team" | "agency";

const PLANS: { id: PlanId; icon: React.ComponentType<{ className?: string }>; name: string; price: string; desc: string; features: string[] }[] = [
  {
    id: "solo",
    icon: User,
    name: "Conseiller Solo",
    price: "9€/mois",
    desc: "Accès complet individuel",
    features: ["Tableau de bord complet", "7 ratios de performance", "GPS objectifs", "Formation personnalisée", "Export JPEG & Excel", "Assistant IA vocal"],
  },
  {
    id: "team",
    icon: Users,
    name: "Équipe",
    price: "9€/conseiller/mois",
    desc: "Manager + conseillers",
    features: ["Tout Solo +", "Cockpit Manager", "GPS Équipe", "Classement équipe", "Formation collective", "Gestion des membres"],
  },
  {
    id: "agency",
    icon: Building2,
    name: "Agence",
    price: "9€/conseiller/mois",
    desc: "Directeur + managers + conseillers",
    features: ["Tout Équipe +", "Pilotage Agence", "GPS Directeur", "Pilotage financier", "Multi-équipes", "Réseau multi-agences"],
  },
];

export default function SouscrirePage() {
  const isDemo = useAppStore((s) => s.isDemo);
  const [selected, setSelected] = useState<PlanId | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChoose = (planId: PlanId) => {
    setSelected(planId);
    setShowPayment(true);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    // Demo: simulate payment
    await new Promise(r => setTimeout(r, 1500));
    setProcessing(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <Check className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Paiement validé</h1>
          <p className="text-sm text-muted-foreground">
            Votre abonnement {PLANS.find(p => p.id === selected)?.name} est maintenant actif.
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

  if (showPayment) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-xl font-bold text-foreground">Finaliser votre abonnement</h1>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">{PLANS.find(p => p.id === selected)?.name}</p>
          <p className="text-lg font-bold text-primary">{PLANS.find(p => p.id === selected)?.price}</p>
        </div>

        <form onSubmit={handlePay} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Numéro de carte</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4242 4242 4242 4242"
                className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Expiration</label>
              <input
                type="text"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="12/28"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">CVV</label>
              <input
                type="text"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                placeholder="123"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          </div>

          {isDemo && (
            <p className="text-[10px] text-muted-foreground text-center">
              Mode démo — aucun paiement réel ne sera effectué
            </p>
          )}

          <button
            type="submit"
            disabled={processing}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Payer
          </button>

          <button
            type="button"
            onClick={() => { setShowPayment(false); setSelected(null); }}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Retour aux offres
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Choisissez votre offre</h1>
        <p className="text-sm text-muted-foreground">Débloquez l'accès complet à NXT Performance</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "flex flex-col rounded-2xl border-2 p-6 transition-all",
              plan.id === "team"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-primary/30"
            )}
          >
            {plan.id === "team" && (
              <span className="mb-3 self-start rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold text-primary-foreground uppercase">
                Populaire
              </span>
            )}
            <plan.icon className="h-8 w-8 text-primary mb-3" />
            <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
            <p className="text-2xl font-bold text-primary mt-1">{plan.price}</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">{plan.desc}</p>
            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => handleChoose(plan.id)}
              className={cn(
                "h-10 w-full rounded-lg font-medium text-sm transition-colors",
                plan.id === "team"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border border-border bg-background text-foreground hover:bg-muted"
              )}
            >
              Choisir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
