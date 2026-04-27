/**
 * Données pour remplir le CERFA AGEFICE 2025-2026.
 * Tous les champs sont optionnels — les champs vides restent vierges sur le PDF.
 * Source : AGEFICE-Demande-de-prise-en-charge-2025-2026-Editable.pdf (94 champs AcroForm).
 */
export interface CerfaInput {
  // Section 1 — Point d'Accueil AGEFICE (PTA)
  pta?: {
    nom?: string;              // "CCI Hérault" | "CPME 34" | etc.
    numero?: string;           // ex: "533"
    interlocuteur?: string;    // ex: "Ahlem Hedhibi"
    adresse?: string;
    codePostal?: string;
    ville?: string;
    telephone?: string;
    email?: string;
  };

  // Section 2 — Entreprise du dirigeant
  entreprise?: {
    raisonSociale?: string;
    nomCommercial?: string;
    codeApeNaf?: string;       // ex: "4619B"
    siret?: string;            // 14 chiffres
    activitePrincipale?: string;
    formeJuridique?: string;   // valeur EXACTE du dropdown PDF (voir field-map.ts)
    adresse?: string;
    codePostal?: string;
    ville?: string;
  };

  // Section 3 — Participant à la formation (le dirigeant)
  participant?: {
    civilite?: "M" | "MME";
    nom?: string;
    prenom?: string;
    nomNaissance?: string;
    dateNaissance?: string;    // format JJ/MM/AAAA
    numeroSecuriteSociale?: string;
    telephone?: string;
    email?: string;
    dernierDiplome?: string;   // valeur EXACTE du dropdown PDF
    ancienneteDirigeant?: "moins_1an" | "1_3_ans" | "4_10_ans" | "plus_10_ans";
  };

  // Section 4 — Organisme de formation (Start Academy si catalogue NXT)
  organismeFormation?: {
    raisonSociale?: string;
    nda?: string;              // numéro déclaration activité
    siret?: string;
    adresse?: string;
    codePostal?: string;
    ville?: string;
    responsable?: {
      civilite?: "M" | "MME";
      nom?: string;
      prenom?: string;
      telephone?: string;
      email?: string;
    };
    contact?: {
      civilite?: "M" | "MME";
      nom?: string;
      prenom?: string;
      telephone?: string;
      email?: string;
    };
  };

  // Section 5 — Action de formation
  formation?: {
    type?: "action" | "bilan_competences" | "vae";  // exclusif
    obligatoire?: boolean;     // true → coche Oui, false → Non, undefined → ni Oui ni Non
    reconversion?: boolean;
    intitule?: string;
    thematique?: string;
    module?: "initiation" | "mise_a_jour" | "perfectionnement";
    qualification?: "diplome_etat" | "titre_homologue" | "qualif_branche" | "cqp" | "sans";
    dateDebut?: string;        // JJ/MM/AAAA
    dateFin?: string;
    dureePresentielIndividuel?: number;
    dureePresentielCollectif?: number;
    dureeFoadSynchrone?: number;
    dureeFoadAsynchrone?: number;
    nomFormateur?: string;
    codePostalLieu?: string;
    villeLieu?: string;
    prixHt?: number;
    formationEnEntreprise?: boolean; // true → Oui, false → Non
    nomAdresseLieuExacte?: string;   // texte multi-lignes
    deroulementPedagogique?: string; // texte multi-lignes
  };

  // Section 6 — Modalités
  modalites?: {
    evaluation?: {
      quiz?: boolean;
      controleContinu?: boolean;
      releves?: boolean;
      feuillesPresence?: boolean;
      autre?: boolean;
    };
    certification?: {
      rncp?: boolean;
      autreDiplome?: boolean;
      autreDiplomePreciser?: string;
      diplomeEtat?: boolean;
      attestationStage?: boolean;
    };
  };

  // Section 7 — Mandat + signature
  signature?: {
    mandat?: boolean;          // true → Start Academy mandataire
    lieuSignature?: string;
    dateSignature?: string;    // JJ/MM/AAAA
  };
}
