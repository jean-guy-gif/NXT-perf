const AGEFICE_KEY = "nxt-agefice-draft";

// ─── Financement Draft ───────────────────────────────────────────────

export type TriAnswer = "oui" | "non" | "ne_sais_pas" | "";
export type TailleAgence = "1_10" | "11_49" | "50_PLUS" | "JE_NE_SAIS_PAS" | "";
export type NatureActiviteMicro =
  | "COMMERCIALE_VENTE"
  | "PRESTATIONS_SERVICES_LIBERAL"
  | "ARTISANALE"
  | "";

export interface AgeficeDraft {
  // ── Step 1 — Préqualification ──
  statut: "independant" | "salarie" | "ne_sais_pas" | "";
  bulletinsSalaireMensuels: TriAnswer;
  versementSalaireParAgence: TriAnswer;
  siretPersonnel: TriAnswer;
  immatriculationRSAC: TriAnswer;
  microEntreprise: TriAnswer;
  cotisationsAJour: TriAnswer;
  attestationUrssafCFPDisponible: TriAnswer;
  tailleAgence: TailleAgence;
  anneeDebutActivite: string; // "YYYY" or ""

  // Conditionnel micro-entrepreneur
  natureActiviteMicro: NatureActiviteMicro;
  caN1: string; // number as string

  // ── Step 2 — Formulaire identité + formation ──
  organisme: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  formationChoisie: string;
  datesSouhaitees: string;

  // ── Step 2 — Champs financement ──
  montantFormationHT: string;
  dureeHeures: string;
  dejaFormationCetteAnnee: TriAnswer;
  montantDejaConsommeCetteAnnee: string;

  // Optionnels (boost confiance)
  codeAPE: string;
  idcc: string;
}

export const emptyAgeficeDraft: AgeficeDraft = {
  statut: "",
  bulletinsSalaireMensuels: "",
  versementSalaireParAgence: "",
  siretPersonnel: "",
  immatriculationRSAC: "",
  microEntreprise: "",
  cotisationsAJour: "",
  attestationUrssafCFPDisponible: "",
  tailleAgence: "",
  anneeDebutActivite: "",
  natureActiviteMicro: "",
  caN1: "",
  organisme: "Start Academy",
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  formationChoisie: "",
  datesSouhaitees: "",
  montantFormationHT: "",
  dureeHeures: "",
  dejaFormationCetteAnnee: "",
  montantDejaConsommeCetteAnnee: "",
  codeAPE: "",
  idcc: "",
};

export function saveAgeficeDraft(data: AgeficeDraft): void {
  try {
    localStorage.setItem(AGEFICE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded or private browsing
  }
}

export function loadAgeficeDraft(): AgeficeDraft | null {
  try {
    const raw = localStorage.getItem(AGEFICE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AgeficeDraft;
  } catch {
    return null;
  }
}

export function clearAgeficeDraft(): void {
  try {
    localStorage.removeItem(AGEFICE_KEY);
  } catch {
    // ignore
  }
}
