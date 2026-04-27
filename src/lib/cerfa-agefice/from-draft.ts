import type { AgeficeDraft } from "@/lib/plan-storage";
import { START_ACADEMY_INFO, isStartAcademy } from "@/data/start-academy-info";
import type { CerfaInput } from "./types";

/**
 * Mappe un AgeficeDraft (state du wizard 3-étapes) vers un CerfaInput
 * (données pour remplir le PDF CERFA AGEFICE).
 *
 * Stratégie :
 * - Champs présents dans AgeficeDraft → mappés vers la bonne section CerfaInput
 * - Si l'organisme est Start Academy → auto-remplissage Section 4 + hardcode
 *   modalités standard NXT (module Perfectionnement, Quiz, Feuilles présence,
 *   Attestation stage)
 * - Champs CerfaInput non couverts par AgeficeDraft → undefined (le PDF reste vierge)
 *
 * V1.5 — sections couvertes (~44 champs CERFA, soit 47 % du formulaire) :
 * - Entreprise           : raison sociale, code NAF/APE, adresse complète,
 *                          forme juridique (microentreprise si applicable)
 * - Participant          : civilité, nom, prénom, nom de naissance, date de
 *                          naissance, NSS, téléphone, email, dernier diplôme,
 *                          ancienneté dérivée
 * - Organisme formation  : COMPLET via START_ACADEMY_INFO si organisme = Start Academy
 *                          (sinon raison sociale uniquement)
 * - Action formation     : intitulé, dateDebut, durée, prix HT, type=action
 *                          + module Perfectionnement (si Start Academy)
 * - Modalités            : Quiz + Feuilles présence + Attestation stage (si Start Academy)
 * - Signature            : mandat coché si Start Academy
 *
 * Sections NON couvertes en V1.5 (Session 2 — wizard étendu) :
 * - PTA complet (8 champs)
 * - Formation : dateFin, nomFormateur, lieu/CP/ville, formationEnEntreprise,
 *               qualification, thématique, déroulement pédagogique
 * - Signature : lieu et date de signature (le mandat est la seule donnée auto V1.5)
 */
export function mapDraftToCerfaInput(draft: AgeficeDraft): CerfaInput {
  const useStartAcademy = isStartAcademy(draft.organisme);

  return {
    pta: undefined, // Wizard V1.5 ne couvre pas encore le Point d'Accueil

    entreprise: {
      // V1.5 : raison sociale et adresse maintenant alimentées
      raisonSociale: emptyToUndef(draft.nomEntreprise),
      nomCommercial: undefined,
      // codeNAF (V1.5) prioritaire sur l'ancien codeAPE (rétrocompat)
      codeApeNaf: emptyToUndef(draft.codeNAF) ?? emptyToUndef(draft.codeAPE),
      siret: undefined, // siretPersonnel reste binaire (oui/non), pas une valeur
      activitePrincipale: undefined,
      formeJuridique: draft.microEntreprise === "oui" ? "microentreprise" : undefined,
      adresse: emptyToUndef(draft.adresseEntreprise),
      codePostal: emptyToUndef(draft.codePostalEntreprise),
      ville: emptyToUndef(draft.villeEntreprise),
    },

    participant: {
      civilite: draft.civilite,
      nom: emptyToUndef(draft.nom),
      prenom: emptyToUndef(draft.prenom),
      // nomNaissance défaut au nom marital si non renseigné explicitement
      nomNaissance: emptyToUndef(draft.nomNaissance) ?? emptyToUndef(draft.nom),
      dateNaissance: convertIsoToFrenchDate(draft.dateNaissance),
      numeroSecuriteSociale: cleanNss(draft.numeroSecuriteSociale),
      telephone: emptyToUndef(draft.telephone),
      email: emptyToUndef(draft.email),
      dernierDiplome: emptyToUndef(draft.dernierDiplome),
      ancienneteDirigeant: computeAnciennete(draft.anneeDebutActivite),
    },

    organismeFormation: useStartAcademy
      ? {
          raisonSociale: START_ACADEMY_INFO.raisonSociale,
          nda: START_ACADEMY_INFO.nda,
          siret: START_ACADEMY_INFO.siret,
          adresse: START_ACADEMY_INFO.adresse,
          codePostal: START_ACADEMY_INFO.codePostal,
          ville: START_ACADEMY_INFO.ville,
          responsable: {
            civilite: START_ACADEMY_INFO.responsable.civilite,
            nom: START_ACADEMY_INFO.responsable.nom,
            prenom: START_ACADEMY_INFO.responsable.prenom,
            telephone: START_ACADEMY_INFO.responsable.telephone,
            email: START_ACADEMY_INFO.responsable.email,
          },
          contact: {
            civilite: START_ACADEMY_INFO.contact.civilite,
            nom: START_ACADEMY_INFO.contact.nom,
            prenom: START_ACADEMY_INFO.contact.prenom,
            telephone: START_ACADEMY_INFO.contact.telephone,
            email: START_ACADEMY_INFO.contact.email,
          },
        }
      : {
          raisonSociale: emptyToUndef(draft.organisme),
          nda: undefined,
          siret: undefined,
          adresse: undefined,
          codePostal: undefined,
          ville: undefined,
          responsable: undefined,
          contact: undefined,
        },

    formation: {
      type: "action", // CERFA "Action de Formation" cochée par défaut
      obligatoire: undefined,
      reconversion: undefined,
      intitule: emptyToUndef(draft.formationChoisie),
      thematique: undefined,
      // V1.5 : module Perfectionnement coché par défaut pour formations Start Academy
      module: useStartAcademy ? "perfectionnement" : undefined,
      qualification: undefined,
      dateDebut: convertIsoToFrenchDate(draft.datesSouhaitees),
      dateFin: undefined,
      dureePresentielIndividuel: undefined,
      dureePresentielCollectif: parseNumberOrUndef(draft.dureeHeures),
      dureeFoadSynchrone: undefined,
      dureeFoadAsynchrone: undefined,
      nomFormateur: undefined,
      codePostalLieu: undefined,
      villeLieu: undefined,
      prixHt: parseNumberOrUndef(draft.montantFormationHT),
      formationEnEntreprise: undefined,
      nomAdresseLieuExacte: undefined,
      deroulementPedagogique: undefined,
    },

    // V1.5 : modalités standard hardcodées si Start Academy
    // (Quiz + Feuilles présence + Attestation stage cohérent avec catalogue NXT)
    modalites: useStartAcademy
      ? {
          evaluation: {
            quiz: true,
            feuillesPresence: true,
          },
          certification: {
            attestationStage: true,
          },
        }
      : undefined,

    signature: {
      // Le mandat est coché lorsque Start Academy gère les démarches AGEFICE
      // pour le dirigeant (cohérent avec exemple Bellus signé). Sinon undefined.
      mandat: useStartAcademy ? true : undefined,
      lieuSignature: undefined, // Wizard V1.5 ne demande pas
      dateSignature: undefined, // Wizard V1.5 ne demande pas
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function emptyToUndef(value: string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function parseNumberOrUndef(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Normalise un NSS pour le CERFA AGEFICE :
 * - Retire tous les espaces et caractères non numériques (l'utilisateur peut
 *   saisir avec ou sans espaces)
 * - Limite à 13 chiffres (le champ TextField CERFA a maxLength=13)
 * - Retourne undefined si vide après nettoyage
 */
function cleanNss(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits === "") return undefined;
  return digits.slice(0, 13);
}

/**
 * Convertit une date ISO `YYYY-MM-DD` (issue d'un input type="date") en format
 * `JJ/MM/AAAA` attendu par le CERFA AGEFICE. Retourne undefined si invalide.
 */
function convertIsoToFrenchDate(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * Dérive l'ancienneté dirigeant depuis l'année de début d'activité.
 * Retourne undefined si année non renseignée ou invalide.
 */
function computeAnciennete(
  anneeStr: string | undefined,
): "moins_1an" | "1_3_ans" | "4_10_ans" | "plus_10_ans" | undefined {
  if (!anneeStr) return undefined;
  const annee = parseInt(anneeStr, 10);
  if (!Number.isFinite(annee) || annee <= 0) return undefined;
  const diff = new Date().getFullYear() - annee;
  if (diff < 0) return undefined;
  if (diff < 1) return "moins_1an";
  if (diff <= 3) return "1_3_ans";
  if (diff <= 10) return "4_10_ans";
  return "plus_10_ans";
}
