const AGEFICE_KEY = "nxt-agefice-draft";

// ─── Financement Draft ───────────────────────────────────────────────

export type TriAnswer = "oui" | "non" | "ne_sais_pas" | "";
export type TailleAgence = "1_10" | "11_49" | "50_PLUS" | "JE_NE_SAIS_PAS" | "";
export type NatureActiviteMicro =
  | "COMMERCIALE_VENTE"
  | "PRESTATIONS_SERVICES_LIBERAL"
  | "ARTISANALE"
  | "";

/**
 * Données du Point d'Accueil AGEFICE (Section 1 du CERFA).
 * `source: "officiel"` → sélectionné dans le référentiel agefice-pta-officiel.ts
 * `source: "manuel"` → saisie libre par l'utilisateur (PTA non listée)
 */
export interface AgeficeDraftPTA {
  source: "officiel" | "manuel" | undefined;
  nom?: string;
  numero?: string;        // pas dans le référentiel officiel — saisie manuelle optionnelle
  interlocuteur?: string; // pas dans le référentiel officiel — saisie manuelle optionnelle
  adresse?: string;
  codePostal?: string;
  ville?: string;
  telephone?: string;
  email?: string;
}

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

  // ── V1.5 — Identification entreprise (Step 1, optionnels) ──
  // Champs ajoutés pour enrichir le remplissage CERFA. Tous optionnels pour
  // préserver la rétrocompatibilité des drafts localStorage antérieurs (lus
  // sans ces champs → undefined au runtime).
  nomEntreprise?: string;          // ex: "William BELLUS Entreprise Individuelle"
  codeNAF?: string;                // ex: "68.31Z" (Agences immobilières)
  adresseEntreprise?: string;
  codePostalEntreprise?: string;
  villeEntreprise?: string;

  // ── V1.5 — Identité dirigeant (Step 2, optionnels) ──
  civilite?: "M" | "MME";
  nomNaissance?: string;           // si différent du nom marital
  dateNaissance?: string;          // format ISO YYYY-MM-DD (input type="date")
  numeroSecuriteSociale?: string;  // 13-15 chiffres, espaces tolérés
  dernierDiplome?: string;         // valeur exacte du dropdown CERFA (DIPLOME_OPTIONS)

  // ── V1.6 — Point d'Accueil AGEFICE (Step 1, optionnel) ──
  pta?: AgeficeDraftPTA;
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
  // V1.5 — initialisés à "" pour cohérence avec le reste du draft
  nomEntreprise: "",
  codeNAF: "",
  adresseEntreprise: "",
  codePostalEntreprise: "",
  villeEntreprise: "",
  civilite: undefined,
  nomNaissance: "",
  dateNaissance: "",
  numeroSecuriteSociale: "",
  dernierDiplome: "",
  pta: undefined,
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
