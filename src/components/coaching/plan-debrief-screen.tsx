"use client";

import { useState } from "react";
import {
  CheckCircle2,
  TrendingUp,
  Euro,
  Users,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { DEMO_COACH_CALENDAR_URL } from "@/config/coaching";
import type { PlanDebriefResult } from "@/lib/plan-debrief";

interface PlanDebriefScreenProps {
  debrief: PlanDebriefResult;
  onClose: () => void;
  onRequestHumanCoach: () => Promise<void>;
  /**
   * Mode lecture seule : utilisé pour "Revoir ce plan" depuis Ma Progression.
   * Désactive les CTA interactifs (RDV, debrief), affiche un bandeau
   * "Plan archivé" et bascule le bouton bas en "Retour à Ma progression".
   */
  readonly?: boolean;
}

function hasFieldGains(debrief: PlanDebriefResult): boolean {
  const g = debrief.fieldGains;
  return (
    g.contacts > 0 ||
    g.estimations > 0 ||
    g.mandats > 0 ||
    g.visites > 0 ||
    g.offres > 0 ||
    g.compromis > 0 ||
    g.actes > 0
  );
}

function formatEur(amount: number): string {
  return (
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
      Math.round(amount)
    ) + " €"
  );
}

export function PlanDebriefScreen({
  debrief,
  onClose,
  onRequestHumanCoach,
  readonly = false,
}: PlanDebriefScreenProps) {
  const [calendarOpened, setCalendarOpened] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleOpenCalendar = () => {
    if (typeof window !== "undefined") {
      window.open(DEMO_COACH_CALENDAR_URL, "_blank", "noopener,noreferrer");
    }
    setCalendarOpened(true);
  };

  const handleConfirmRDV = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      await onRequestHumanCoach();
    } finally {
      setConfirming(false);
    }
  };

  const showRoi = debrief.isImproving && debrief.monthlyGainEur > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-foreground">Debrief de ton plan 30 jours</h1>
        <p className="text-muted-foreground">
          Focalisé sur : <span className="font-medium text-foreground">{debrief.ratioLabel}</span>
        </p>
      </div>

      {readonly && (
        <div className="rounded-lg border border-muted-foreground/30 bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
          <span aria-hidden="true">📁</span> Mode consultation — plan archivé, aucune
          action n'est plus nécessaire ici.
        </div>
      )}

      {/* SECTION 1 — Ton plan en chiffres */}
      <section className="space-y-4 rounded-lg border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Ton plan en chiffres
        </h2>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat
            label="Actions validées"
            value={`${debrief.actionsStats.done}/${debrief.actionsStats.total}`}
            sublabel={`${debrief.actionsStats.percentDone}%`}
          />
          <Stat
            label="Saisies réalisées"
            value={`${debrief.weeksWithSaisie}`}
            sublabel="sur 4 attendues"
          />
          <Stat
            label="Ratio avant → après"
            value={`${debrief.ratioBaseline} → ${debrief.ratioCurrent}`}
            sublabel={
              debrief.isImproving
                ? `+${Math.abs(debrief.ratioDeltaPoints)} pts`
                : `${debrief.ratioDeltaPoints} pts`
            }
            accent={debrief.isImproving ? "positive" : "neutral"}
          />
        </div>
      </section>

      {/* SECTION 2 — Résultats concrets */}
      <section className="space-y-4 rounded-lg border border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Euro className="h-5 w-5 text-green-600" />
          Tes résultats concrets
        </h2>

        {showRoi ? (
          <div className="space-y-3">
            <div>
              <div className="text-3xl font-bold text-green-600">
                +{formatEur(debrief.annualProjectedEur)}
              </div>
              <div className="text-sm text-muted-foreground">
                de CA projeté annualisé grâce au plan
              </div>
            </div>
            <div className="space-y-1 border-t border-border pt-2 text-sm text-foreground">
              {debrief.additionalEstimationsPerMonth !== null && (
                <div>
                  📊 +{debrief.additionalEstimationsPerMonth} estimations par mois
                </div>
              )}
              <div>🎯 +{debrief.additionalActesPerMonth} actes supplémentaires par mois</div>
              <div>💰 Soit environ {formatEur(debrief.monthlyGainEur)} par mois</div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Le plan n&apos;a pas encore produit d&apos;amélioration mesurable. Pas d&apos;inquiétude,
            un coach humain peut t&apos;aider à débloquer la situation.
          </p>
        )}

        {hasFieldGains(debrief) && (
          <div className="space-y-1.5 border-t border-green-500/20 pt-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              📊 Grâce au plan, tu as réalisé :
            </div>
            <div className="space-y-1 pl-1 text-sm text-foreground">
              {debrief.fieldGains.contacts > 0 && (
                <div>✅ +{debrief.fieldGains.contacts} contacts supplémentaires</div>
              )}
              {debrief.fieldGains.estimations > 0 && (
                <div>✅ +{debrief.fieldGains.estimations} estimations de plus</div>
              )}
              {debrief.fieldGains.mandats > 0 && (
                <div>✅ +{debrief.fieldGains.mandats} mandats signés en plus</div>
              )}
              {debrief.fieldGains.visites > 0 && (
                <div>✅ +{debrief.fieldGains.visites} visites en plus</div>
              )}
              {debrief.fieldGains.offres > 0 && (
                <div>✅ +{debrief.fieldGains.offres} offres reçues en plus</div>
              )}
              {debrief.fieldGains.compromis > 0 && (
                <div>✅ +{debrief.fieldGains.compromis} compromis signés</div>
              )}
              {debrief.fieldGains.actes > 0 && (
                <div>✅ +{debrief.fieldGains.actes} actes supplémentaires</div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* SECTION 3 — Et après ? (cachée en mode readonly — plan archivé,
          on n'incite pas à prendre RDV ou cliquer pour fermer) */}
      {readonly ? (
        <section className="space-y-3 rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Ce plan est archivé. Tu peux retourner à Ma progression pour
            consulter ton historique complet ou lancer un nouveau plan.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Retour à Ma progression
          </button>
        </section>
      ) : (
      <section className="space-y-4 rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-blue-500/5 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Users className="h-5 w-5 text-primary" />
          Et après ?
        </h2>

        {showRoi ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded bg-muted/40 p-3">
                <div>
                  <div className="font-medium text-foreground">Continuer seul</div>
                  <div className="text-xs text-muted-foreground">à 6 mois</div>
                </div>
                <div className="text-xl font-semibold text-foreground">
                  +{formatEur(debrief.sixMonthsAloneEur)}
                </div>
              </div>

              <div className="flex items-center justify-between rounded border border-primary/30 bg-primary/10 p-3">
                <div>
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Avec coach NXT
                  </div>
                  <div className="text-xs text-muted-foreground">à 6 mois</div>
                </div>
                <div className="text-xl font-bold text-primary">
                  +{formatEur(debrief.sixMonthsWithCoachEur)}
                </div>
              </div>

              <div className="rounded border border-green-500/30 bg-green-500/10 p-3 text-center">
                <div className="text-sm text-muted-foreground">Potentiel supplémentaire</div>
                <div className="text-2xl font-bold text-green-600">
                  +{formatEur(debrief.upsideCoachEur)}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-3">
              {!calendarOpened ? (
                <button
                  type="button"
                  onClick={handleOpenCalendar}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  📅 Prendre RDV avec un coach NXT
                  <ExternalLink className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmRDV}
                  disabled={confirming}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  {confirming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  J&apos;ai pris RDV avec le coach
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-md border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
              >
                Continuer seul — retour au plan
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-foreground">
              Un coach NXT peut t&apos;aider à débloquer la situation et remettre ton
              plan sur les rails.
            </p>
            {!calendarOpened ? (
              <button
                type="button"
                onClick={handleOpenCalendar}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                📅 Prendre RDV avec un coach NXT
                <ExternalLink className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmRDV}
                disabled={confirming}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                {confirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                J&apos;ai pris RDV avec le coach
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-md border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
            >
              Retour au plan
            </button>
          </>
        )}
      </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: string;
  sublabel?: string;
  accent?: "positive" | "neutral";
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={
          accent === "positive"
            ? "text-xl font-bold text-green-600"
            : "text-xl font-bold text-foreground"
        }
      >
        {value}
      </div>
      {sublabel && <div className="text-xs text-muted-foreground">{sublabel}</div>}
    </div>
  );
}
