/**
 * Mapping exhaustif des 94 champs AcroForm du CERFA AGEFICE 2025-2026.
 * Source : audit pypdf du PDF officiel.
 * Les noms doivent matcher EXACTEMENT (espaces inclus).
 */

export const FIELD_NAMES = {
  // Section 1 - Point d'Accueil
  PTA_NOM: "Nom du PTA",
  PTA_NUMERO: "N° de PTA",
  PTA_INTERLOCUTEUR: "Interlocuteur PTA",
  PTA_ADRESSE: "Adresse PTA",
  PTA_CODE_POSTAL: "Code Postal (PTA)",
  PTA_VILLE: "Ville (PTA)",
  PTA_TELEPHONE: "N° de Téléphone PTA",
  PTA_EMAIL: "Adresse Email PTA",

  // Section 2 - Entreprise
  ENT_RAISON_SOCIALE: "Nom / Raison Sociale de L'entreprise (Entreprise)",
  ENT_NOM_COMMERCIAL: "Nom commercial de l'entreprise (Entreprise)",
  ENT_APE: "Code APE - NAF (Entreprise)",
  ENT_SIRET: "N° SIRET (Entreprise)",
  ENT_ACTIVITE: "Activité Professionnelle (Entreprise)",
  ENT_FORME_JURIDIQUE: "Forme juridique (Entreprise)",  // DROPDOWN
  ENT_ADRESSE: "Adresse Entreprise",
  ENT_CODE_POSTAL: "Code Postal (Entreprise)",
  ENT_VILLE: "Ville (Entreprise)",

  // Section 3 - Participant
  PART_MR: "MR (Stagiaire)",            // CHECKBOX
  PART_MME: "MME (Stagiaire)",          // CHECKBOX
  PART_NOM: "Nom (Stagiaire)",
  PART_PRENOM: "Prénom  (Stagiaire)",   // double espace, à respecter
  PART_NOM_NAISSANCE: "Nom de naissance  (Stagiaire)",
  PART_DATE_NAISSANCE: "Date de Naissance  (Stagiaire)",
  PART_NSS: "N° de Sécurité Sociale  (Stagiaire)",
  PART_TELEPHONE: "N° de Téléphone  (Stagiaire)",
  PART_EMAIL: "Adresse Email  (Stagiaire)",
  PART_DIPLOME: "Sélectionner le dernier diplôme obtenu",  // DROPDOWN
  PART_ANC_MOINS_1AN: "< 1an",
  PART_ANC_1_3: "1 à 3 ans",
  PART_ANC_4_10: "4-10 ans",
  PART_ANC_PLUS_10: "+ de 10 ans",

  // Section 4 - Organisme de Formation
  OF_RAISON_SOCIALE: "Raison Sociale ( OF)",
  OF_NDA: "NDA (OF)",
  OF_SIRET: "N° SIRET (OF)",
  OF_ADRESSE: "Adresse (OF)",
  OF_CODE_POSTAL: "Code Postal (OF)",
  OF_VILLE: "Ville (OF)",
  OF_RESP_MR: "MR (Resp.OF)",           // CHECKBOX
  OF_RESP_MME: "MME (Resp.OF)",         // CHECKBOX
  OF_RESP_NOM: "Nom Responsable (OF)",
  OF_RESP_PRENOM: "Prénom Responsable (OF)",
  OF_RESP_TEL: "N° de Téléphone - Responsable (OF)",
  OF_RESP_EMAIL: "Adresse Email - Responsable (OF)",
  OF_CONTACT_MR: "MR (Contact OF)",
  OF_CONTACT_MME: "MME (Contact OF)",
  OF_CONTACT_NOM: "Nom - Contact (OF)",
  OF_CONTACT_PRENOM: "Prénom - Contact (OF)",
  OF_CONTACT_TEL: "N° de Téléphone - Contact (OF)",
  OF_CONTACT_EMAIL: "Adresse Email - Contact (OF)",

  // Section 5 - Action
  ACT_FORMATION: "Action de Formation",            // CHECKBOX, par défaut coché /Oui
  ACT_BILAN: "Bilan de Compétences",
  ACT_VAE: "VAE",
  ACT_OBLIGATOIRE_OUI: "obligatoire (Oui)",
  ACT_OBLIGATOIRE_NON: "Obligatoire (Non)",
  ACT_RECONVERSION_OUI: "Reconversion (Oui)",
  ACT_RECONVERSION_NON: "reconversion ( Non)",
  ACT_INTITULE: "Intitulé Exact ( Formation)",
  ACT_THEMATIQUE: "Thématique (Formation)",
  ACT_MOD_INITIATION: "Initiation",
  ACT_MOD_MISE_A_JOUR: "Mise à jour",
  ACT_MOD_PERFECTIONNEMENT: "Perfectionnement",
  ACT_QUAL_TITRE_HOMOLOGUE: "Titre Homologué",
  ACT_QUAL_QUALIF_BRANCHE: "Qualif Branche",
  ACT_QUAL_CQP: "CQP",
  ACT_QUAL_SANS: "Sans Qualification",
  ACT_DATE_DEBUT: "Date de Début (Formation)",
  ACT_DATE_FIN: "Date de Fin (Formation)",
  ACT_DUREE_PRES_IND: "Durée ( Présentiel Individuel - Formation)",
  ACT_DUREE_PRES_COLL: "Durée ( Présentiel Collectif - Formation)",
  ACT_DUREE_FOAD_SYNC: "Durée ( FOAD Synchrone - Formation)",
  ACT_DUREE_FOAD_ASYNC: "Durée ( FOAD Asynchrone - Formation)",
  ACT_NOM_FORMATEUR: "Nom du formateur",
  ACT_CODE_POSTAL_LIEU: "Code Postal (Lieu de Formation)",
  ACT_VILLE_LIEU: "Ville (Lieu de Formation)",
  ACT_PRIX_HT: "Prix Ht (Formation)",
  ACT_FORM_ENT_OUI: "Form en Entreprise (Oui)",
  ACT_FORM_ENT_NON: "Form en Entreprise (Non)",
  ACT_NOM_ADRESSE_LIEU: "Nom et Adresse exacte du lieu de formation",
  ACT_DEROULEMENT: "Déroulement Pédagogique (Formation) - 1 -",

  // Section 6 - Modalités
  MOD_EVAL_QUIZ: "Quiz",
  MOD_EVAL_CONTROLE: "Contrôle continu",
  MOD_EVAL_RELEVES: "Relevés",
  MOD_EVAL_FEUILLES: "Feuilles de présence",
  MOD_EVAL_AUTRE: "Autre",
  MOD_CERT_RNCP: "RNCP",
  MOD_CERT_AUTRE_DIPLOME: "Autre Diplôme",
  MOD_CERT_AUTRE_PRECISER: "Si Autre : Préciser",
  MOD_CERT_DIPLOME_ETAT: "Diplôme Etat",
  MOD_CERT_ATTESTATION: "Attestation de Stage",

  // Section 7 - Signature
  SIG_MANDAT: "Mandat (Oui)",
  SIG_LIEU: "Lieu de Signature",
  SIG_DATE: "Date de Signature",
} as const;

/**
 * Valeurs disponibles dans le dropdown "Forme juridique (Entreprise)".
 * À ne pas modifier — doit matcher les options du PDF.
 */
export const FORME_JURIDIQUE_OPTIONS = [
  "Entreprise individuelle",
  "EI",
  "EIRL",
  "SARL",
  "microentreprise",
  "SAS",
  "SASU",
  "SA",
] as const;

/**
 * Valeurs disponibles dans le dropdown "Sélectionner le dernier diplôme obtenu".
 * Texte EXACT du dropdown PDF.
 */
export const DIPLOME_OPTIONS = [
  "Bac+5 : Sup. à la maîtrise",
  "Bac+3 : Licence ou maîtrise",
  "Bac+2 : BTS-DUT-DEUG",
  "Bac-Bac pro-BT-BP",
  "BEP-CAP",
  "Fin de scolarité obligatoire",
] as const;
