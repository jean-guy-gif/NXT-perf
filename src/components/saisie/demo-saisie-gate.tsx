"use client";

import { useState } from "react";
import { Mic, PenLine, Table2, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SaisieMode = "vocal" | "manuel" | "tableau" | null;

interface DemoSaisieGateProps {
  onComplete: () => void;
}

const MODES = [
  { id: "vocal" as const, icon: Mic, emoji: "\u{1F3A4}", label: "Vocal", desc: "Dicter vos résultats à voix haute" },
  { id: "manuel" as const, icon: PenLine, emoji: "\u270F\uFE0F", label: "Manuel", desc: "Répondre question par question" },
  { id: "tableau" as const, icon: Table2, emoji: "\u{1F4CA}", label: "Tableau", desc: "Renseigner directement dans un tableau" },
];

const FIELDS = [
  { key: "contacts", label: "Contacts entrants cette semaine", defaultVal: 12 },
  { key: "mandats", label: "Mandats signés", defaultVal: 3 },
  { key: "visites", label: "Visites réalisées", defaultVal: 8 },
  { key: "offres", label: "Offres reçues", defaultVal: 2 },
  { key: "ca", label: "Chiffre d'affaires encaissé (\u20AC)", defaultVal: 24000 },
];

export function DemoSaisieGate({ onComplete }: DemoSaisieGateProps) {
  const [mode, setMode] = useState<SaisieMode>(null);
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(FIELDS.map(f => [f.key, f.defaultVal]))
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    setSubmitting(true);
    // Store demo saisie flag in cookie
    document.cookie = "nxt-demo-saisie=true;path=/;max-age=28800";
    // Short delay for UX feedback
    setTimeout(() => onComplete(), 600);
  };

  // ── Mode selection ──
  if (!mode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Lance ton diagnostic de la semaine
            </h1>
            <p className="text-sm text-muted-foreground">
              2 minutes pour identifier ton levier prioritaire
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-card/50 p-6 text-center transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
              >
                <span className="text-3xl">{m.emoji}</span>
                <p className="text-sm font-semibold text-foreground">{m.label}</p>
                <p className="text-xs text-muted-foreground leading-snug">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Saisie form ──
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-foreground">
            Diagnostic — {MODES.find(m => m.id === mode)?.label}
          </h1>
          <p className="text-sm text-muted-foreground">
            Faisons le point sur ta semaine
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          {FIELDS.map((field, i) => (
            <div key={field.key} className="flex items-center justify-between gap-4">
              <label className="text-sm text-foreground flex-1">
                <span className="text-muted-foreground mr-2">{i + 1}.</span>
                {field.label}
              </label>
              <input
                type="number"
                value={values[field.key]}
                onChange={(e) => setValues(prev => ({ ...prev, [field.key]: Number(e.target.value) }))}
                className={cn(
                  "h-9 w-28 rounded-lg border border-input bg-background px-3 text-right text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring",
                  field.key === "ca" && "w-36"
                )}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Valider ma simulation
          </button>

          <button
            type="button"
            onClick={() => setMode(null)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Changer de mode
          </button>
        </div>
      </div>
    </div>
  );
}
