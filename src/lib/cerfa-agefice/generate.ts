import { PDFDocument } from "pdf-lib";
import { FIELD_NAMES } from "./field-map";
import type { CerfaInput } from "./types";

/**
 * Charge le PDF CERFA officiel AGEFICE 2025-2026 et remplit les champs.
 * Retourne un Uint8Array du PDF rempli, prêt à être téléchargé.
 *
 * @param input Données partielles à injecter dans le CERFA
 * @param pdfBytes Bytes du PDF source (à charger côté serveur via fs ou côté client via fetch)
 * @returns Uint8Array du PDF rempli
 */
export async function generateCerfaPdf(
  input: CerfaInput,
  pdfBytes: ArrayBuffer | Uint8Array
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  // Helpers safe — n'écrivent rien si valeur undefined/null/""
  const setText = (fieldName: string, value: string | number | undefined | null) => {
    if (value === undefined || value === null || value === "") return;
    try {
      form.getTextField(fieldName).setText(String(value));
    } catch (err) {
      console.warn(`[CERFA] Champ texte introuvable ou erreur: "${fieldName}"`, err);
    }
  };

  const setCheckbox = (fieldName: string, checked: boolean | undefined) => {
    if (checked === undefined) return;
    try {
      const cb = form.getCheckBox(fieldName);
      if (checked) cb.check();
      else cb.uncheck();
    } catch (err) {
      console.warn(`[CERFA] Checkbox introuvable ou erreur: "${fieldName}"`, err);
    }
  };

  const setDropdown = (fieldName: string, value: string | undefined) => {
    if (!value) return;
    try {
      form.getDropdown(fieldName).select(value);
    } catch (err) {
      console.warn(`[CERFA] Dropdown introuvable ou erreur: "${fieldName}" = "${value}"`, err);
    }
  };

  // ============================================================
  // Section 1 - Point d'Accueil
  // ============================================================
  setText(FIELD_NAMES.PTA_NOM, input.pta?.nom);
  setText(FIELD_NAMES.PTA_NUMERO, input.pta?.numero);
  setText(FIELD_NAMES.PTA_INTERLOCUTEUR, input.pta?.interlocuteur);
  setText(FIELD_NAMES.PTA_ADRESSE, input.pta?.adresse);
  setText(FIELD_NAMES.PTA_CODE_POSTAL, input.pta?.codePostal);
  setText(FIELD_NAMES.PTA_VILLE, input.pta?.ville);
  setText(FIELD_NAMES.PTA_TELEPHONE, input.pta?.telephone);
  setText(FIELD_NAMES.PTA_EMAIL, input.pta?.email);

  // ============================================================
  // Section 2 - Entreprise
  // ============================================================
  setText(FIELD_NAMES.ENT_RAISON_SOCIALE, input.entreprise?.raisonSociale);
  setText(FIELD_NAMES.ENT_NOM_COMMERCIAL, input.entreprise?.nomCommercial);
  setText(FIELD_NAMES.ENT_APE, input.entreprise?.codeApeNaf);
  setText(FIELD_NAMES.ENT_SIRET, input.entreprise?.siret);
  setText(FIELD_NAMES.ENT_ACTIVITE, input.entreprise?.activitePrincipale);
  setDropdown(FIELD_NAMES.ENT_FORME_JURIDIQUE, input.entreprise?.formeJuridique);
  setText(FIELD_NAMES.ENT_ADRESSE, input.entreprise?.adresse);
  setText(FIELD_NAMES.ENT_CODE_POSTAL, input.entreprise?.codePostal);
  setText(FIELD_NAMES.ENT_VILLE, input.entreprise?.ville);

  // ============================================================
  // Section 3 - Participant
  // ============================================================
  setCheckbox(FIELD_NAMES.PART_MR, input.participant?.civilite === "M");
  setCheckbox(FIELD_NAMES.PART_MME, input.participant?.civilite === "MME");
  setText(FIELD_NAMES.PART_NOM, input.participant?.nom);
  setText(FIELD_NAMES.PART_PRENOM, input.participant?.prenom);
  setText(FIELD_NAMES.PART_NOM_NAISSANCE, input.participant?.nomNaissance);
  setText(FIELD_NAMES.PART_DATE_NAISSANCE, input.participant?.dateNaissance);
  setText(FIELD_NAMES.PART_NSS, input.participant?.numeroSecuriteSociale);
  setText(FIELD_NAMES.PART_TELEPHONE, input.participant?.telephone);
  setText(FIELD_NAMES.PART_EMAIL, input.participant?.email);
  setDropdown(FIELD_NAMES.PART_DIPLOME, input.participant?.dernierDiplome);
  setCheckbox(FIELD_NAMES.PART_ANC_MOINS_1AN, input.participant?.ancienneteDirigeant === "moins_1an");
  setCheckbox(FIELD_NAMES.PART_ANC_1_3, input.participant?.ancienneteDirigeant === "1_3_ans");
  setCheckbox(FIELD_NAMES.PART_ANC_4_10, input.participant?.ancienneteDirigeant === "4_10_ans");
  setCheckbox(FIELD_NAMES.PART_ANC_PLUS_10, input.participant?.ancienneteDirigeant === "plus_10_ans");

  // ============================================================
  // Section 4 - Organisme de Formation
  // ============================================================
  setText(FIELD_NAMES.OF_RAISON_SOCIALE, input.organismeFormation?.raisonSociale);
  setText(FIELD_NAMES.OF_NDA, input.organismeFormation?.nda);
  setText(FIELD_NAMES.OF_SIRET, input.organismeFormation?.siret);
  setText(FIELD_NAMES.OF_ADRESSE, input.organismeFormation?.adresse);
  setText(FIELD_NAMES.OF_CODE_POSTAL, input.organismeFormation?.codePostal);
  setText(FIELD_NAMES.OF_VILLE, input.organismeFormation?.ville);
  setCheckbox(FIELD_NAMES.OF_RESP_MR, input.organismeFormation?.responsable?.civilite === "M");
  setCheckbox(FIELD_NAMES.OF_RESP_MME, input.organismeFormation?.responsable?.civilite === "MME");
  setText(FIELD_NAMES.OF_RESP_NOM, input.organismeFormation?.responsable?.nom);
  setText(FIELD_NAMES.OF_RESP_PRENOM, input.organismeFormation?.responsable?.prenom);
  setText(FIELD_NAMES.OF_RESP_TEL, input.organismeFormation?.responsable?.telephone);
  setText(FIELD_NAMES.OF_RESP_EMAIL, input.organismeFormation?.responsable?.email);
  setCheckbox(FIELD_NAMES.OF_CONTACT_MR, input.organismeFormation?.contact?.civilite === "M");
  setCheckbox(FIELD_NAMES.OF_CONTACT_MME, input.organismeFormation?.contact?.civilite === "MME");
  setText(FIELD_NAMES.OF_CONTACT_NOM, input.organismeFormation?.contact?.nom);
  setText(FIELD_NAMES.OF_CONTACT_PRENOM, input.organismeFormation?.contact?.prenom);
  setText(FIELD_NAMES.OF_CONTACT_TEL, input.organismeFormation?.contact?.telephone);
  setText(FIELD_NAMES.OF_CONTACT_EMAIL, input.organismeFormation?.contact?.email);

  // ============================================================
  // Section 5 - Action de Formation
  // ============================================================
  setCheckbox(FIELD_NAMES.ACT_FORMATION, input.formation?.type === "action");
  setCheckbox(FIELD_NAMES.ACT_BILAN, input.formation?.type === "bilan_competences");
  setCheckbox(FIELD_NAMES.ACT_VAE, input.formation?.type === "vae");
  setCheckbox(FIELD_NAMES.ACT_OBLIGATOIRE_OUI, input.formation?.obligatoire === true);
  setCheckbox(FIELD_NAMES.ACT_OBLIGATOIRE_NON, input.formation?.obligatoire === false);
  setCheckbox(FIELD_NAMES.ACT_RECONVERSION_OUI, input.formation?.reconversion === true);
  setCheckbox(FIELD_NAMES.ACT_RECONVERSION_NON, input.formation?.reconversion === false);
  setText(FIELD_NAMES.ACT_INTITULE, input.formation?.intitule);
  setText(FIELD_NAMES.ACT_THEMATIQUE, input.formation?.thematique);
  setCheckbox(FIELD_NAMES.ACT_MOD_INITIATION, input.formation?.module === "initiation");
  setCheckbox(FIELD_NAMES.ACT_MOD_MISE_A_JOUR, input.formation?.module === "mise_a_jour");
  setCheckbox(FIELD_NAMES.ACT_MOD_PERFECTIONNEMENT, input.formation?.module === "perfectionnement");
  setCheckbox(FIELD_NAMES.ACT_QUAL_TITRE_HOMOLOGUE, input.formation?.qualification === "titre_homologue");
  setCheckbox(FIELD_NAMES.ACT_QUAL_QUALIF_BRANCHE, input.formation?.qualification === "qualif_branche");
  setCheckbox(FIELD_NAMES.ACT_QUAL_CQP, input.formation?.qualification === "cqp");
  setCheckbox(FIELD_NAMES.ACT_QUAL_SANS, input.formation?.qualification === "sans");
  setText(FIELD_NAMES.ACT_DATE_DEBUT, input.formation?.dateDebut);
  setText(FIELD_NAMES.ACT_DATE_FIN, input.formation?.dateFin);
  setText(FIELD_NAMES.ACT_DUREE_PRES_IND, input.formation?.dureePresentielIndividuel);
  setText(FIELD_NAMES.ACT_DUREE_PRES_COLL, input.formation?.dureePresentielCollectif);
  setText(FIELD_NAMES.ACT_DUREE_FOAD_SYNC, input.formation?.dureeFoadSynchrone);
  setText(FIELD_NAMES.ACT_DUREE_FOAD_ASYNC, input.formation?.dureeFoadAsynchrone);
  setText(FIELD_NAMES.ACT_NOM_FORMATEUR, input.formation?.nomFormateur);
  setText(FIELD_NAMES.ACT_CODE_POSTAL_LIEU, input.formation?.codePostalLieu);
  setText(FIELD_NAMES.ACT_VILLE_LIEU, input.formation?.villeLieu);
  setText(FIELD_NAMES.ACT_PRIX_HT, input.formation?.prixHt);
  setCheckbox(FIELD_NAMES.ACT_FORM_ENT_OUI, input.formation?.formationEnEntreprise === true);
  setCheckbox(FIELD_NAMES.ACT_FORM_ENT_NON, input.formation?.formationEnEntreprise === false);
  setText(FIELD_NAMES.ACT_NOM_ADRESSE_LIEU, input.formation?.nomAdresseLieuExacte);
  setText(FIELD_NAMES.ACT_DEROULEMENT, input.formation?.deroulementPedagogique);

  // ============================================================
  // Section 6 - Modalités
  // ============================================================
  setCheckbox(FIELD_NAMES.MOD_EVAL_QUIZ, input.modalites?.evaluation?.quiz);
  setCheckbox(FIELD_NAMES.MOD_EVAL_CONTROLE, input.modalites?.evaluation?.controleContinu);
  setCheckbox(FIELD_NAMES.MOD_EVAL_RELEVES, input.modalites?.evaluation?.releves);
  setCheckbox(FIELD_NAMES.MOD_EVAL_FEUILLES, input.modalites?.evaluation?.feuillesPresence);
  setCheckbox(FIELD_NAMES.MOD_EVAL_AUTRE, input.modalites?.evaluation?.autre);
  setCheckbox(FIELD_NAMES.MOD_CERT_RNCP, input.modalites?.certification?.rncp);
  setCheckbox(FIELD_NAMES.MOD_CERT_AUTRE_DIPLOME, input.modalites?.certification?.autreDiplome);
  setText(FIELD_NAMES.MOD_CERT_AUTRE_PRECISER, input.modalites?.certification?.autreDiplomePreciser);
  setCheckbox(FIELD_NAMES.MOD_CERT_DIPLOME_ETAT, input.modalites?.certification?.diplomeEtat);
  setCheckbox(FIELD_NAMES.MOD_CERT_ATTESTATION, input.modalites?.certification?.attestationStage);

  // Cas particulier : qualification "diplome_etat" coche aussi MOD_CERT_DIPLOME_ETAT
  if (input.formation?.qualification === "diplome_etat") {
    setCheckbox(FIELD_NAMES.MOD_CERT_DIPLOME_ETAT, true);
  }

  // ============================================================
  // Section 7 - Signature
  // ============================================================
  setCheckbox(FIELD_NAMES.SIG_MANDAT, input.signature?.mandat);
  setText(FIELD_NAMES.SIG_LIEU, input.signature?.lieuSignature);
  setText(FIELD_NAMES.SIG_DATE, input.signature?.dateSignature);

  // Sauvegarder le PDF rempli
  // updateFieldAppearances=true force le re-rendu visuel des champs (important pour les checkboxes)
  return await pdfDoc.save({ updateFieldAppearances: true });
}
