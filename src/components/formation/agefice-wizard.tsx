"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { saveAgeficeDraft, loadAgeficeDraft, emptyAgeficeDraft } from "@/lib/plan-storage";
import type { AgeficeDraft, TriAnswer, TailleAgence } from "@/lib/plan-storage";
import { downloadDossierText } from "@/lib/agefice-pdf";
import { MICRO_NATURE_LABELS } from "@/lib/fundingRules";
import type { NatureActiviteMicro } from "@/lib/plan-storage";
import type { SimulationResult } from "@/lib/simulateTrainingRights";
import {
  X, ChevronRight, ChevronLeft, Download, ExternalLink,
  CheckCircle, AlertTriangle, Calculator, Shield, FileText,
  Loader2, Info,
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

/* ─── Tri-choice buttons ─── */
function TriChoice({ label, value, onChange }: { label: string; value: TriAnswer; onChange: (v: TriAnswer) => void }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      <div className="flex gap-2">
        {([
          { v: "oui" as const, l: "Oui" },
          { v: "non" as const, l: "Non" },
          { v: "ne_sais_pas" as const, l: "Je ne sais pas" },
        ]).map((o) => (
          <button key={o.v} type="button" onClick={() => onChange(o.v)}
            className={cn("flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
              value === o.v ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"
            )}>{o.l}</button>
        ))}
      </div>
    </div>
  );
}

const INPUT_CLS = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";
const LABEL_CLS = "mb-1 block text-xs font-medium text-muted-foreground";

export function AgeficeWizard({ onClose, formationOptions }: AgeficeWizardProps) {
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<AgeficeDraft>(emptyAgeficeDraft);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);

  useEffect(() => {
    const saved = loadAgeficeDraft();
    if (saved) {
      setDraft(saved);
      if (saved.statut && saved.bulletinsSalaireMensuels && saved.anneeDebutActivite) setStep(2);
    } else if (user) {
      setDraft((d) => ({ ...d, nom: user.lastName, prenom: user.firstName, email: user.email }));
    }
  }, [user]);

  const updateDraft = useCallback((updates: Partial<AgeficeDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...updates };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => saveAgeficeDraft(next), 500);
      return next;
    });
  }, []);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleDownload = useCallback(() => {
    downloadDossierText(draft) ? showToast("success", "Dossier téléchargé !") : showToast("error", "Impossible de télécharger.");
  }, [draft, showToast]);

  const handleSendToStartAcademy = useCallback(() => {
    window.open("https://start-academy.smartof.app/formulaire-inscription-sessions/VTJGc2RHVmtYMS94MDZNWTdiRmlyU0J5djJTK2hKelIxRWlhVHoyVVdDa09JNFQzMjBWLzkrMXoyeGdYSnhwTHZlN1dJR3VYdW1MaVJMTEU1elZNdXBSY2c3V2RHU0k1dWljOCtGcW5BL2U1NS9PdzlCUzlCcS9vYWFOOGo0dEtnM1AxWDhxN1BWVWpuVStpRGRRR2krR1AzOUxHQ05GWGlXS2pCbnk4bm41Y1Y4cDd1bmUwV2NyamdKQWU3UHU4ZTFqRWlMQ3BiNU5aZ0hneUxWampyUXVpUTBkdU1RT3QvVEVPOGJYZG5rUTVhaUxRS29nL0N1UUlaMTN0b3A0NU9SQnh1N3BuTGlpWGU0NW5kbTA3WlkwUkViZ0QzTCtGUHdvYkJMTEQxUDg5/soumettre", "_blank");
  }, []);

  const handleSimulate = useCallback(async () => {
    setSimLoading(true);
    try {
      const res = await fetch("/api/training-rights", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, meta: { page: "wizard", source: "step3" } }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Erreur serveur");
      const data = await res.json();
      setSimResult(data.result);
      setShowSimModal(true);
    } catch {
      showToast("error", "Impossible de calculer les droits.");
    } finally {
      setSimLoading(false);
    }
  }, [draft, showToast]);

  // ─── Validation ───
  const canGoStep2 =
    draft.statut !== "" &&
    draft.bulletinsSalaireMensuels !== "" &&
    draft.versementSalaireParAgence !== "" &&
    draft.siretPersonnel !== "" &&
    draft.immatriculationRSAC !== "" &&
    draft.microEntreprise !== "" &&
    draft.cotisationsAJour !== "" &&
    draft.attestationUrssafCFPDisponible !== "" &&
    draft.tailleAgence !== "" &&
    draft.anneeDebutActivite !== "" &&
    (draft.microEntreprise !== "oui" || (draft.natureActiviteMicro !== "" && draft.caN1 !== ""));

  const canGoStep3 =
    draft.nom !== "" && draft.prenom !== "" && draft.email !== "" &&
    draft.formationChoisie !== "" && draft.montantFormationHT !== "" &&
    draft.dureeHeures !== "" && draft.dejaFormationCetteAnnee !== "";

  const currentYear = new Date().getFullYear();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 z-20 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <X className="h-5 w-5" />
        </button>

        {toast && (
          <div className={cn("absolute left-4 right-4 top-4 z-10 flex items-center gap-2 rounded-lg p-3 text-sm font-medium shadow-lg",
            toast.type === "success" ? "bg-green-500/20 text-green-500 border border-green-500/30" : "bg-red-500/20 text-red-500 border border-red-500/30"
          )}>
            {toast.type === "success" ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            {toast.message}
          </div>
        )}

        <div className="p-6">
          {/* Stepper */}
          <div className="mb-6 flex items-center justify-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.number} className="flex items-center gap-2">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors",
                  step >= s.number ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {step > s.number ? <CheckCircle className="h-4 w-4" /> : s.number}
                </div>
                {i < STEPS.length - 1 && <div className={cn("h-0.5 w-8", step > s.number ? "bg-primary" : "bg-muted")} />}
              </div>
            ))}
          </div>
          <p className="mb-6 text-center text-sm font-medium text-muted-foreground">{STEPS[step - 1].label}</p>

          {/* ─── ÉTAPE 1 : PRÉQUALIFICATION ─── */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Statut */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Quel est votre statut ?</label>
                <div className="flex gap-2">
                  {([
                    { value: "independant", label: "Indépendant" },
                    { value: "salarie", label: "Salarié" },
                    { value: "ne_sais_pas", label: "Je ne sais pas / mixte" },
                  ] as const).map((o) => (
                    <button key={o.value} type="button" onClick={() => updateDraft({ statut: o.value })}
                      className={cn("flex-1 rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                        draft.statut === o.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"
                      )}>{o.label}</button>
                  ))}
                </div>
              </div>

              <TriChoice label="Recevez-vous des bulletins de salaire mensuels ?" value={draft.bulletinsSalaireMensuels} onChange={(v) => updateDraft({ bulletinsSalaireMensuels: v })} />
              <TriChoice label="Votre agence vous verse-t-elle un salaire ?" value={draft.versementSalaireParAgence} onChange={(v) => updateDraft({ versementSalaireParAgence: v })} />
              <TriChoice label="Avez-vous un SIRET personnel ?" value={draft.siretPersonnel} onChange={(v) => updateDraft({ siretPersonnel: v })} />
              <TriChoice label="Êtes-vous immatriculé(e) au RSAC ?" value={draft.immatriculationRSAC} onChange={(v) => updateDraft({ immatriculationRSAC: v })} />
              <TriChoice label="Êtes-vous micro-entrepreneur ?" value={draft.microEntreprise}
                onChange={(v) => updateDraft({ microEntreprise: v, ...(v !== "oui" ? { natureActiviteMicro: "", caN1: "" } : {}) })} />

              {/* Conditionnel micro */}
              {draft.microEntreprise === "oui" && (
                <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div>
                    <label className={LABEL_CLS}>Nature de votre activité</label>
                    <select value={draft.natureActiviteMicro}
                      onChange={(e) => updateDraft({ natureActiviteMicro: e.target.value as NatureActiviteMicro })}
                      className={INPUT_CLS}>
                      <option value="">Sélectionnez</option>
                      {(Object.entries(MICRO_NATURE_LABELS) as [Exclude<NatureActiviteMicro, "">, string][]).map(([k, l]) => (
                        <option key={k} value={k}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Chiffre d&apos;affaires N-1 (€)</label>
                    <input type="number" min={0} placeholder="ex : 45 000" value={draft.caN1}
                      onChange={(e) => updateDraft({ caN1: e.target.value })} className={INPUT_CLS} />
                  </div>
                </div>
              )}

              <TriChoice label="Vos cotisations (URSSAF / caisses) sont-elles à jour ?" value={draft.cotisationsAJour} onChange={(v) => updateDraft({ cotisationsAJour: v })} />
              <TriChoice label="Avez-vous une attestation URSSAF / CFP disponible ?" value={draft.attestationUrssafCFPDisponible} onChange={(v) => updateDraft({ attestationUrssafCFPDisponible: v })} />

              {/* Taille agence */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Taille de votre agence (effectif)</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "1_10", label: "1 à 10" },
                    { value: "11_49", label: "11 à 49" },
                    { value: "50_PLUS", label: "50+" },
                    { value: "JE_NE_SAIS_PAS", label: "Je ne sais pas" },
                  ] as { value: TailleAgence; label: string }[]).map((o) => (
                    <button key={o.value} type="button" onClick={() => updateDraft({ tailleAgence: o.value })}
                      className={cn("rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                        draft.tailleAgence === o.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"
                      )}>{o.label}</button>
                  ))}
                </div>
              </div>

              {/* Année début */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Depuis quelle année exercez-vous ?</label>
                <input type="number" min={1950} max={currentYear} placeholder="ex : 2019" value={draft.anneeDebutActivite}
                  onChange={(e) => updateDraft({ anneeDebutActivite: e.target.value })} className={INPUT_CLS} />
              </div>

              {/* Nav */}
              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted">Faire plus tard</button>
                <button onClick={() => { saveAgeficeDraft(draft); setStep(2); }} disabled={!canGoStep2}
                  className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                    canGoStep2 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}>Suivant <ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}

          {/* ─── ÉTAPE 2 : FORMULAIRE ─── */}
          {step === 2 && (
            <div className="space-y-4">
              <div><label className={LABEL_CLS}>Organisme de formation</label>
                <input type="text" value={draft.organisme} onChange={(e) => updateDraft({ organisme: e.target.value })} className={INPUT_CLS} /></div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className={LABEL_CLS}>Nom</label>
                  <input type="text" value={draft.nom} onChange={(e) => updateDraft({ nom: e.target.value })} className={INPUT_CLS} /></div>
                <div><label className={LABEL_CLS}>Prénom</label>
                  <input type="text" value={draft.prenom} onChange={(e) => updateDraft({ prenom: e.target.value })} className={INPUT_CLS} /></div>
              </div>

              <div><label className={LABEL_CLS}>Email</label>
                <input type="email" value={draft.email} onChange={(e) => updateDraft({ email: e.target.value })} className={INPUT_CLS} /></div>

              <div><label className={LABEL_CLS}>Téléphone</label>
                <input type="tel" value={draft.telephone} onChange={(e) => updateDraft({ telephone: e.target.value })} placeholder="06 12 34 56 78" className={INPUT_CLS} /></div>

              <div><label className={LABEL_CLS}>Formation choisie</label>
                <select value={draft.formationChoisie} onChange={(e) => updateDraft({ formationChoisie: e.target.value })} className={INPUT_CLS}>
                  <option value="">Sélectionnez une formation</option>
                  {formationOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select></div>

              <div><label className={LABEL_CLS}>Dates souhaitées</label>
                <input type="date" value={draft.datesSouhaitees} onChange={(e) => updateDraft({ datesSouhaitees: e.target.value })} className={INPUT_CLS} /></div>

              {/* Financement */}
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informations financement</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={LABEL_CLS}>Montant formation (€ HT)</label>
                      <input type="number" min={0} placeholder="ex : 2 500" value={draft.montantFormationHT}
                        onChange={(e) => updateDraft({ montantFormationHT: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>Durée (heures)</label>
                      <input type="number" min={1} placeholder="ex : 35" value={draft.dureeHeures}
                        onChange={(e) => updateDraft({ dureeHeures: e.target.value })} className={INPUT_CLS} /></div>
                  </div>

                  <TriChoice label="Avez-vous déjà suivi une formation financée cette année ?" value={draft.dejaFormationCetteAnnee}
                    onChange={(v) => updateDraft({ dejaFormationCetteAnnee: v, ...(v !== "oui" ? { montantDejaConsommeCetteAnnee: "" } : {}) })} />

                  {draft.dejaFormationCetteAnnee === "oui" && (
                    <div><label className={LABEL_CLS}>Montant déjà consommé cette année (€)</label>
                      <input type="number" min={0} placeholder="ex : 1 200" value={draft.montantDejaConsommeCetteAnnee}
                        onChange={(e) => updateDraft({ montantDejaConsommeCetteAnnee: e.target.value })} className={INPUT_CLS} /></div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={LABEL_CLS}>Code APE (si vous le connaissez)</label>
                      <input type="text" placeholder="ex : 68.31Z" value={draft.codeAPE}
                        onChange={(e) => updateDraft({ codeAPE: e.target.value })} className={INPUT_CLS} /></div>
                    <div><label className={LABEL_CLS}>IDCC (si vous le connaissez)</label>
                      <input type="text" placeholder="ex : 1527" value={draft.idcc}
                        onChange={(e) => updateDraft({ idcc: e.target.value })} className={INPUT_CLS} /></div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">
                  <ChevronLeft className="h-4 w-4" /> Retour</button>
                <button onClick={() => { saveAgeficeDraft(draft); setStep(3); }} disabled={!canGoStep3}
                  className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                    canGoStep3 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}>Suivant <ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}

          {/* ─── ÉTAPE 3 : RÉSULTAT ─── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold text-foreground">Récapitulatif du dossier</h3>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identité</p>
                <SR label="Nom" value={`${draft.prenom} ${draft.nom}`} />
                <SR label="Email" value={draft.email} />
                <SR label="Téléphone" value={draft.telephone || "—"} />
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Situation professionnelle</p>
                <SR label="Statut" value={draft.statut === "independant" ? "Indépendant" : draft.statut === "salarie" ? "Salarié" : "Ne sait pas / mixte"} />
                <SR label="Bulletins de salaire" value={tl(draft.bulletinsSalaireMensuels)} />
                <SR label="Salaire par agence" value={tl(draft.versementSalaireParAgence)} />
                <SR label="SIRET personnel" value={tl(draft.siretPersonnel)} />
                <SR label="Immatriculation RSAC" value={tl(draft.immatriculationRSAC)} />
                <SR label="Micro-entrepreneur" value={tl(draft.microEntreprise)} />
                {draft.microEntreprise === "oui" && <>
                  <SR label="Nature activité" value={draft.natureActiviteMicro ? MICRO_NATURE_LABELS[draft.natureActiviteMicro] || draft.natureActiviteMicro : "—"} />
                  <SR label="CA N-1" value={draft.caN1 ? `${draft.caN1} €` : "—"} />
                </>}
                <SR label="Cotisations à jour" value={tl(draft.cotisationsAJour)} />
                <SR label="Attestation URSSAF/CFP" value={tl(draft.attestationUrssafCFPDisponible)} />
                <SR label="Taille agence" value={({ "1_10": "1-10", "11_49": "11-49", "50_PLUS": "50+", "JE_NE_SAIS_PAS": "Ne sait pas", "": "—" } as Record<string, string>)[draft.tailleAgence] || "—"} />
                <SR label="Début d'activité" value={draft.anneeDebutActivite || "—"} />
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Formation</p>
                <SR label="Organisme" value={draft.organisme} />
                <SR label="Formation" value={draft.formationChoisie} />
                <SR label="Dates" value={draft.datesSouhaitees ? new Date(draft.datesSouhaitees).toLocaleDateString("fr-FR") : "—"} />
                <SR label="Montant (€ HT)" value={draft.montantFormationHT ? `${draft.montantFormationHT} €` : "—"} />
                <SR label="Durée" value={draft.dureeHeures ? `${draft.dureeHeures} h` : "—"} />
                {draft.codeAPE && <SR label="Code APE" value={draft.codeAPE} />}
                {draft.idcc && <SR label="IDCC" value={draft.idcc} />}
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Financement</p>
                <SR label="Formation financée cette année" value={tl(draft.dejaFormationCetteAnnee)} />
                {draft.dejaFormationCetteAnnee === "oui" && <SR label="Montant consommé" value={draft.montantDejaConsommeCetteAnnee ? `${draft.montantDejaConsommeCetteAnnee} €` : "—"} />}
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={handleDownload} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  <Download className="h-4 w-4" /> Télécharger le dossier</button>
                <button onClick={handleSendToStartAcademy} className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted">
                  <ExternalLink className="h-4 w-4" /> S&apos;inscrire sur Start Academy</button>
                <button onClick={handleSimulate} disabled={simLoading}
                  className="flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-60">
                  {simLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                  {simLoading ? "Calcul en cours…" : "Calculer mes droits à la formation"}</button>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(2)} className="flex items-center gap-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted">
                  <ChevronLeft className="h-4 w-4" /> Modifier</button>
                <button onClick={onClose} className="flex-1 rounded-lg bg-muted px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/80">Fermer</button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Modal Simulation ─── */}
        {showSimModal && simResult && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <Calculator className="h-5 w-5 text-primary" /> Mes droits à la formation</h3>
                <button onClick={() => setShowSimModal(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
              </div>

              <div className="mb-4 rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Financeur probable</span>
                  <span className="text-sm font-bold text-foreground">{simResult.fundingLabel}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Confiance</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold",
                    simResult.confidence === "FORTE" ? "bg-green-500/20 text-green-500" : simResult.confidence === "MOYENNE" ? "bg-orange-500/20 text-orange-500" : "bg-red-500/20 text-red-500"
                  )}>{simResult.confidence}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Année de référence</span>
                  <span className="text-sm font-medium text-foreground">{simResult.referenceYear}</span></div>
              </div>

              <div className="mb-4 rounded-xl border border-border bg-card p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estimation financière</p>
                <div className="space-y-2.5">
                  <SimRow label="Plafond annuel" value={simResult.annualCapEUR !== null && simResult.annualCapEUR > 0 ? `${simResult.annualCapEUR} €` : null} />
                  {simResult.cfpMicro !== null && simResult.cfpMicro > 0 && <SimRow label="CFP estimée" value={`${simResult.cfpMicro.toFixed(2)} €`} />}
                  {simResult.montantConsomme > 0 && <SimRow label="Déjà consommé" value={`${simResult.montantConsomme} €`} />}
                  <SimRow label="Droit restant" value={simResult.droitRestant !== null ? `${simResult.droitRestant} €` : null} />
                  <SimRow label="Montant formation" value={`${simResult.montantFormation} €`} />
                  <div className="border-t border-border pt-2.5">
                    <SimRow label="Prise en charge estimée" value={simResult.priseEnChargeEstimee !== null ? `${simResult.priseEnChargeEstimee} €` : null} bold />
                  </div>
                  <SimRow label="Reste à charge" value={simResult.resteACharge !== null ? `${simResult.resteACharge} €` : null} bold />
                </div>
              </div>

              {simResult.reasons.length > 0 && (
                <div className="mb-4 rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Info className="h-3.5 w-3.5" /> Raisons</p>
                  <ul className="space-y-1">{simResult.reasons.map((r, i) => <li key={i} className="text-sm text-foreground">• {r}</li>)}</ul>
                </div>
              )}

              {simResult.requiredDocs.length > 0 && (
                <div className="mb-4 rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><FileText className="h-3.5 w-3.5" /> Pièces à préparer</p>
                  <ul className="space-y-1">{simResult.requiredDocs.map((d, i) => <li key={i} className="text-sm text-foreground">• {d}</li>)}</ul>
                </div>
              )}

              <div className="mb-4 flex items-start gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                <p className="text-xs leading-relaxed text-orange-600 dark:text-orange-400">
                  Estimation indicative, sous réserve de validation par l&apos;organisme financeur. Start Academy ne peut pas garantir l&apos;accord.</p>
              </div>

              <button onClick={() => setShowSimModal(false)} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Compris</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Helpers ─── */
function tl(v: TriAnswer): string { return v === "oui" ? "Oui" : v === "non" ? "Non" : v === "ne_sais_pas" ? "Ne sait pas" : "—"; }

function SR({ label, value }: { label: string; value: string }) {
  return (<div className="flex items-start justify-between gap-4 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium text-foreground">{value}</span>
  </div>);
}

function SimRow({ label, value, bold }: { label: string; value: string | null; bold?: boolean }) {
  return (<div className="flex items-center justify-between text-sm">
    <span className={cn("text-muted-foreground", bold && "font-medium text-foreground")}>{label}</span>
    <span className={cn("font-medium", bold ? "text-primary" : "text-foreground")}>{value ?? "À confirmer"}</span>
  </div>);
}
