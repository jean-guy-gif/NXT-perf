"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import {
  saveAgeficeDraft,
  loadAgeficeDraft,
  emptyAgeficeDraft,
} from "@/lib/plan-storage";
import type { AgeficeDraft } from "@/lib/plan-storage";
import { downloadDossierText } from "@/lib/agefice-pdf";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Download,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface AgeficeWizardProps {
  onClose: () => void;
  formationOptions: string[];
}

const STEPS = [
  { label: "Préqualification", number: 1 },
  { label: "Formulaire", number: 2 },
  { label: "Résultat", number: 3 },
];

export function AgeficeWizard({ onClose, formationOptions }: AgeficeWizardProps) {
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<AgeficeDraft>(emptyAgeficeDraft);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load draft from localStorage
  useEffect(() => {
    const saved = loadAgeficeDraft();
    if (saved) {
      setDraft(saved);
      // If pre-qualification was already done, skip to step 2
      if (saved.statut && saved.cotisantAgefice) {
        setStep(2);
      }
    } else if (user) {
      setDraft((d) => ({
        ...d,
        nom: user.lastName,
        prenom: user.firstName,
        email: user.email,
      }));
    }
  }, [user]);

  // Debounced autosave
  const updateDraft = useCallback(
    (updates: Partial<AgeficeDraft>) => {
      setDraft((prev) => {
        const next = { ...prev, ...updates };
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => saveAgeficeDraft(next), 500);
        return next;
      });
    },
    []
  );

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleDownload = useCallback(() => {
    const success = downloadDossierText(draft);
    if (success) {
      showToast("success", "Dossier téléchargé avec succès !");
    } else {
      showToast("error", "Impossible de télécharger le dossier.");
    }
  }, [draft, showToast]);

  const handleSendToStartAcademy = useCallback(() => {
    window.open(
      "https://start-academy.smartof.app/formulaire-inscription-sessions/VTJGc2RHVmtYMS94MDZNWTdiRmlyU0J5djJTK2hKelIxRWlhVHoyVVdDa09JNFQzMjBWLzkrMXoyeGdYSnhwTHZlN1dJR3VYdW1MaVJMTEU1elZNdXBSY2c3V2RHU0k1dWljOCtGcW5BL2U1NS9PdzlCUzlCcS9vYWFOOGo0dEtnM1AxWDhxN1BWVWpuVStpRGRRR2krR1AzOUxHQ05GWGlXS2pCbnk4bm41Y1Y4cDd1bmUwV2NyamdKQWU3UHU4ZTFqRWlMQ3BiNU5aZ0hneUxWampyUXVpUTBkdU1RT3QvVEVPOGJYZG5rUTVhaUxRS29nL0N1UUlaMTN0b3A0NU9SQnh1N3BuTGlpWGU0NW5kbTA3WlkwUkViZ0QzTCtGUHdvYkJMTEQxUDg5/soumettre",
      "_blank"
    );
  }, []);

  const canGoStep2 = draft.statut !== "" && draft.cotisantAgefice !== "";
  const canGoStep3 =
    draft.nom !== "" &&
    draft.prenom !== "" &&
    draft.email !== "" &&
    draft.formationChoisie !== "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Toast */}
        {toast && (
          <div
            className={cn(
              "absolute left-4 right-4 top-4 z-10 flex items-center gap-2 rounded-lg p-3 text-sm font-medium shadow-lg",
              toast.type === "success"
                ? "bg-green-500/20 text-green-500 border border-green-500/30"
                : "bg-red-500/20 text-red-500 border border-red-500/30"
            )}
          >
            {toast.type === "success" ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            {toast.message}
          </div>
        )}

        <div className="p-6">
          {/* Stepper */}
          <div className="mb-6 flex items-center justify-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.number} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors",
                    step >= s.number
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step > s.number ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    s.number
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-8",
                      step > s.number ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="mb-6 text-center text-sm font-medium text-muted-foreground">
            {STEPS[step - 1].label}
          </p>

          {/* ─── Étape 1 : Préqualification ─── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Quel est votre statut ?
                </label>
                <div className="flex gap-3">
                  {[
                    { value: "independant" as const, label: "Indépendant" },
                    { value: "salarie" as const, label: "Salarié" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateDraft({ statut: opt.value })}
                      className={cn(
                        "flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                        draft.statut === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Êtes-vous cotisant AGEFICE ?
                </label>
                <div className="flex gap-3">
                  {[
                    { value: "oui" as const, label: "Oui" },
                    { value: "non" as const, label: "Non" },
                    { value: "ne_sais_pas" as const, label: "Je ne sais pas" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() =>
                        updateDraft({ cotisantAgefice: opt.value })
                      }
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                        draft.cotisantAgefice === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {draft.cotisantAgefice === "non" && (
                <div className="flex items-start gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  <p className="text-sm text-orange-500">
                    L&apos;AGEFICE finance la formation des dirigeants d&apos;entreprise
                    non salariés. D&apos;autres financements peuvent exister pour votre
                    situation. Vous pouvez tout de même constituer un dossier.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  Faire plus tard
                </button>
                <button
                  onClick={() => {
                    saveAgeficeDraft(draft);
                    setStep(2);
                  }}
                  disabled={!canGoStep2}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                    canGoStep2
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── Étape 2 : Formulaire ─── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Organisme de formation
                </label>
                <input
                  type="text"
                  value={draft.organisme}
                  onChange={(e) => updateDraft({ organisme: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={draft.nom}
                    onChange={(e) => updateDraft({ nom: e.target.value })}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={draft.prenom}
                    onChange={(e) => updateDraft({ prenom: e.target.value })}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => updateDraft({ email: e.target.value })}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={draft.telephone}
                  onChange={(e) => updateDraft({ telephone: e.target.value })}
                  placeholder="06 12 34 56 78"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Formation choisie
                </label>
                <select
                  value={draft.formationChoisie}
                  onChange={(e) =>
                    updateDraft({ formationChoisie: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">Sélectionnez une formation</option>
                  {formationOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Dates souhaitées
                </label>
                <input
                  type="date"
                  value={draft.datesSouhaitees}
                  onChange={(e) =>
                    updateDraft({ datesSouhaitees: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Retour
                </button>
                <button
                  onClick={() => {
                    saveAgeficeDraft(draft);
                    setStep(3);
                  }}
                  disabled={!canGoStep3}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                    canGoStep3
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── Étape 3 : Résultat ─── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold text-foreground">
                    Récapitulatif du dossier
                  </h3>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <SummaryRow label="Nom" value={`${draft.prenom} ${draft.nom}`} />
                <SummaryRow label="Email" value={draft.email} />
                <SummaryRow label="Téléphone" value={draft.telephone || "—"} />
                <SummaryRow
                  label="Statut"
                  value={draft.statut === "independant" ? "Indépendant" : "Salarié"}
                />
                <SummaryRow
                  label="Cotisant AGEFICE"
                  value={
                    draft.cotisantAgefice === "oui"
                      ? "Oui"
                      : draft.cotisantAgefice === "non"
                        ? "Non"
                        : "Ne sait pas"
                  }
                />
                <SummaryRow label="Organisme" value={draft.organisme} />
                <SummaryRow label="Formation" value={draft.formationChoisie} />
                <SummaryRow
                  label="Dates"
                  value={
                    draft.datesSouhaitees
                      ? new Date(draft.datesSouhaitees).toLocaleDateString("fr-FR")
                      : "—"
                  }
                />
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Download className="h-4 w-4" />
                  Télécharger le dossier
                </button>
                <button
                  onClick={handleSendToStartAcademy}
                  className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <ExternalLink className="h-4 w-4" />
                  S&apos;inscrire sur Start Academy
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Modifier
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 rounded-lg bg-muted px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
