"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, FileUp, PenLine, Sparkles } from "lucide-react";
import { useAppStore } from "@/stores/app-store";

// ─── Personas ────────────────────────────────────────────────────────────────

type PersonaId = "warrior" | "sport_coach" | "kind_coach" | "neutral_male" | "neutral_female";

interface PersonaGreeting {
  line1: (firstName: string) => string;
  line2: string;
}

const PERSONA_GREETINGS: Record<PersonaId, PersonaGreeting> = {
  warrior: {
    line1: () => "Rapport de semaine.",
    line2: "2 minutes. Allons-y.",
  },
  sport_coach: {
    line1: () => "C'est l'heure du debrief !",
    line2: "Ta semaine en 2 min.",
  },
  kind_coach: {
    line1: () => "Tu as bossé dur cette semaine.",
    line2: "Prends 2 minutes pour en faire le bilan.",
  },
  neutral_male: {
    line1: (name) => `Bonne semaine, ${name}.`,
    line2: "Prends 2 minutes pour saisir ton activité.",
  },
  neutral_female: {
    line1: (name) => `Bonne semaine, ${name}.`,
    line2: "Prends 2 minutes pour saisir ton activité.",
  },
};

const DEFAULT_GREETING: PersonaGreeting = {
  line1: (name) => `Bonne semaine, ${name} 👊`,
  line2: "Prends 2 minutes pour faire le point sur ta semaine. C'est le moment.",
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface MondayGateProps {
  onDismiss: () => void;
  onStartVoice: () => void;
  onStartImport: () => void;
  onStartManual: () => void;
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function MondayGate({ onDismiss, onStartVoice, onStartImport, onStartManual }: MondayGateProps) {
  const user = useAppStore((s) => s.user);
  const [showModeSelect, setShowModeSelect] = useState(false);

  const firstName = user?.firstName || "Conseiller";

  // Pour l'instant, persona par défaut (neutral). Phase 5 lira user_voice_preferences.
  const personaId: PersonaId | null = null;
  const greeting = personaId ? PERSONA_GREETINGS[personaId] : DEFAULT_GREETING;

  if (!showModeSelect) {
    // ── Écran 1 : Bienvenue ────────────────────────────────────────────────
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
        {/* Subtle gradient background */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

        <div className="relative z-10 flex max-w-md flex-col items-center gap-8 px-6 text-center">
          {/* Logo / icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>

          {/* Greeting */}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {greeting.line1(firstName)}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              {greeting.line2}
            </p>
          </div>

          {/* CTA principal */}
          <button
            onClick={() => setShowModeSelect(true)}
            className="w-full max-w-xs rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            Démarrer mon bilan
          </button>

          {/* Passer */}
          <button
            onClick={onDismiss}
            className="mt-4 text-xs text-muted-foreground transition-colors hover:text-muted-foreground/70"
            style={{ fontSize: 12 }}
          >
            Passer pour l&apos;instant
          </button>
        </div>
      </div>
    );
  }

  // ── Écran 2 : Sélection du mode ──────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

      <div className="relative z-10 flex max-w-lg flex-col items-center gap-10 px-6 text-center">
        <h2 className="text-xl font-bold text-foreground">
          Comment tu veux saisir ?
        </h2>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Voix */}
          <button
            onClick={onStartVoice}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
              <Mic className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">À la voix</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Guidé, 2 min</p>
            </div>
          </button>

          {/* Import */}
          <button
            onClick={onStartImport}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
              <FileUp className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Importer un fichier</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Excel / PDF / Photo</p>
            </div>
          </button>

          {/* Manuel */}
          <button
            onClick={onStartManual}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
              <PenLine className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Saisir manuellement</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Formulaire classique</p>
            </div>
          </button>
        </div>

        {/* Passer */}
        <button
          onClick={onDismiss}
          className="text-xs text-muted-foreground transition-colors hover:text-muted-foreground/70"
          style={{ fontSize: 12 }}
        >
          Passer pour l&apos;instant
        </button>
      </div>
    </div>
  );
}
