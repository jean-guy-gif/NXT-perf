"use client";

import { useState } from "react";
import { CalendarCheck, AlertCircle, Mic } from "lucide-react";
import type { GateType } from "@/hooks/use-saisie-gate";
import { NxtVoiceAssistant } from "@/components/saisie/nxt-voice-assistant";
import type { ExtractedFields } from "@/lib/saisie-ai-client";
import Link from "next/link";

interface SaisieGateProps {
  gateType: GateType;
  onDismiss: () => void;
}

export function SaisieGate({ gateType, onDismiss }: SaisieGateProps) {
  const [showAssistant, setShowAssistant] = useState(false);

  if (!gateType) return null;

  const isMonthly = gateType === "monthly";

  const handleFieldsExtracted = (_fields: ExtractedFields) => {
    // Les champs seront appliqués via la page saisie
    // Pour l'instant, redirige vers la saisie après extraction
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-background/95 backdrop-blur-md">
        <div className="w-full max-w-md text-center">
          {/* Icône */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <CalendarCheck className="h-8 w-8 text-primary" />
            </div>
          </div>

          {/* Titre */}
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            {isMonthly ? "Saisie mensuelle requise" : "Saisie hebdomadaire requise"}
          </h1>

          {/* Message */}
          <p className="mb-2 text-muted-foreground">
            {isMonthly
              ? "Vous n'avez pas encore saisi vos résultats ce mois-ci."
              : "Vous n'avez pas encore saisi vos résultats cette semaine."}
          </p>
          <p className="mb-8 text-sm text-muted-foreground">
            Complétez votre saisie pour accéder à votre tableau de bord.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            {/* Voice assistant */}
            <button
              onClick={() => setShowAssistant(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Mic className="h-4 w-4" />
              Saisie vocale avec NXT Assistant
            </button>

            {/* Saisie manuelle */}
            <Link
              href="/saisie"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Saisie manuelle
            </Link>
          </div>

          {/* Note */}
          <div className="mt-6 flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-left">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {isMonthly
                ? "Une saisie mensuelle suffit pour débloquer l'accès ce mois-ci. La saisie hebdomadaire reste recommandée pour un suivi optimal."
                : "Une saisie par semaine vous permet d'avoir des indicateurs à jour et des recommandations personnalisées."}
            </p>
          </div>
        </div>
      </div>

      <NxtVoiceAssistant
        isOpen={showAssistant}
        onClose={() => { setShowAssistant(false); onDismiss(); }}
        onFieldsExtracted={handleFieldsExtracted}
        isMandatory={true}
      />
    </>
  );
}
