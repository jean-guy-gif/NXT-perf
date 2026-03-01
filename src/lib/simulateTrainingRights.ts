import type { AgeficeDraft, TriAnswer } from "@/lib/plan-storage";
import { type FundingBodyId, getCapForYear, getFundingLabel, computeMicroCap, RULES_VERSION } from "@/lib/fundingRules";

export type ConfidenceLevel = "FORTE" | "MOYENNE" | "FAIBLE";

export interface SimulationInput {
  statut: AgeficeDraft["statut"];
  bulletinsSalaireMensuels: TriAnswer;
  versementSalaireParAgence: TriAnswer;
  siretPersonnel: TriAnswer;
  immatriculationRSAC: TriAnswer;
  microEntreprise: TriAnswer;
  cotisationsAJour: TriAnswer;
  attestationUrssafCFPDisponible: TriAnswer;
  tailleAgence: AgeficeDraft["tailleAgence"];
  anneeDebutActivite: string;
  natureActiviteMicro: AgeficeDraft["natureActiviteMicro"];
  caN1: string;
  dejaFormationCetteAnnee: TriAnswer;
  montantDejaConsommeCetteAnnee: string;
  montantFormationHT: string;
  dureeHeures: string;
  datesSouhaitees: string;
  codeAPE: string;
  idcc: string;
}

export interface SimulationResult {
  fundingBody: FundingBodyId;
  fundingLabel: string;
  confidence: ConfidenceLevel;
  referenceYear: string;
  annualCapEUR: number | null;
  cfpMicro: number | null;
  montantConsomme: number;
  droitRestant: number | null;
  priseEnChargeEstimee: number | null;
  resteACharge: number | null;
  montantFormation: number;
  reasons: string[];
  requiredDocs: string[];
  ruleVersion: string;
  computedAt: string;
}

export function extractInputFromDraft(draft: AgeficeDraft): SimulationInput {
  return {
    statut: draft.statut,
    bulletinsSalaireMensuels: draft.bulletinsSalaireMensuels,
    versementSalaireParAgence: draft.versementSalaireParAgence,
    siretPersonnel: draft.siretPersonnel,
    immatriculationRSAC: draft.immatriculationRSAC,
    microEntreprise: draft.microEntreprise,
    cotisationsAJour: draft.cotisationsAJour,
    attestationUrssafCFPDisponible: draft.attestationUrssafCFPDisponible,
    tailleAgence: draft.tailleAgence,
    anneeDebutActivite: draft.anneeDebutActivite,
    natureActiviteMicro: draft.natureActiviteMicro,
    caN1: draft.caN1,
    dejaFormationCetteAnnee: draft.dejaFormationCetteAnnee,
    montantDejaConsommeCetteAnnee: draft.montantDejaConsommeCetteAnnee,
    montantFormationHT: draft.montantFormationHT,
    dureeHeures: draft.dureeHeures,
    datesSouhaitees: draft.datesSouhaitees,
    codeAPE: draft.codeAPE,
    idcc: draft.idcc,
  };
}

/* ─── Contradiction detection ─── */
function hasContradiction(input: SimulationInput): boolean {
  const isSalarie = input.bulletinsSalaireMensuels === "oui" || input.versementSalaireParAgence === "oui";
  const isMicro = input.microEntreprise === "oui";
  return isSalarie && isMicro;
}

/* ─── Funding body deduction ─── */
function determineFundingBody(input: SimulationInput): {
  fundingBody: FundingBodyId;
  confidence: ConfidenceLevel;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Contradiction check
  if (hasContradiction(input)) {
    reasons.push("Contradiction détectée : vous indiquez recevoir des bulletins de salaire ET être micro-entrepreneur");
    reasons.push("Veuillez vérifier vos pièces (bulletins vs facturation)");
    return { fundingBody: "INCONNU", confidence: "FAIBLE", reasons };
  }

  const nspFields = [
    input.bulletinsSalaireMensuels,
    input.versementSalaireParAgence,
    input.siretPersonnel,
    input.immatriculationRSAC,
    input.microEntreprise,
  ];
  const nspCount = nspFields.filter((v) => v === "ne_sais_pas").length;

  // 1) OPCO EP — salarié
  if (input.bulletinsSalaireMensuels === "oui" || input.versementSalaireParAgence === "oui") {
    if (input.bulletinsSalaireMensuels === "oui") {
      reasons.push("Vous recevez des bulletins de salaire mensuels → profil salarié");
    }
    if (input.versementSalaireParAgence === "oui") {
      reasons.push("Votre agence vous verse un salaire → cotisation OPCO");
    }
    reasons.push("Les critères varient selon la branche et l'effectif. La demande est faite par l'employeur.");

    const confidence: ConfidenceLevel = nspCount === 0 ? "FORTE" : "MOYENNE";
    return { fundingBody: "OPCO_EP", confidence, reasons };
  }

  // 2) Indépendant / FAF
  const isIndep = input.siretPersonnel === "oui" || input.immatriculationRSAC === "oui" || input.microEntreprise === "oui";

  if (isIndep) {
    // 2a) Micro-entrepreneur → CFP / AGEFICE micro
    if (input.microEntreprise === "oui") {
      reasons.push("Micro-entrepreneur → financement via la CFP (contribution à la formation professionnelle)");
      if (input.siretPersonnel === "oui") reasons.push("SIRET personnel confirmé");
      if (input.immatriculationRSAC === "oui") reasons.push("Immatriculation RSAC confirmée");

      const confidence: ConfidenceLevel = nspCount === 0 ? "FORTE" : "MOYENNE";
      return { fundingBody: "AGEFICE_MICRO", confidence, reasons };
    }

    // 2b) Indépendant non micro → FAF à confirmer
    if (input.siretPersonnel === "oui") reasons.push("SIRET personnel → travailleur indépendant");
    if (input.immatriculationRSAC === "oui") reasons.push("Immatriculation RSAC → agent commercial indépendant");
    reasons.push("Le FAF compétent dépend de votre activité (AGEFICE, FIFPL, etc.)");

    const confidence: ConfidenceLevel = nspCount <= 1 ? "MOYENNE" : "FAIBLE";
    return { fundingBody: "FAF_A_CONFIRMER", confidence, reasons };
  }

  // 3) Statut déclaré sans preuves factuelles
  if (input.statut === "independant") {
    reasons.push("Statut déclaré : indépendant, mais aucune pièce factuelle confirmée");
    reasons.push("Veuillez vérifier votre SIRET ou immatriculation RSAC");
    return { fundingBody: "FAF_A_CONFIRMER", confidence: "FAIBLE", reasons };
  }

  if (input.statut === "salarie") {
    reasons.push("Statut déclaré : salarié, mais pas de bulletin de salaire confirmé");
    reasons.push("Veuillez vérifier auprès de votre agence");
    return { fundingBody: "OPCO_EP", confidence: "FAIBLE", reasons };
  }

  // 4) Inconnu
  reasons.push("Les informations fournies ne permettent pas de déterminer le financeur");
  reasons.push("Nous vous recommandons de vérifier vos pièces justificatives");
  return { fundingBody: "INCONNU", confidence: "FAIBLE", reasons };
}

/* ─── Rights computation ─── */
export function computeRights(input: SimulationInput): SimulationResult {
  const { fundingBody, confidence, reasons } = determineFundingBody(input);

  // Reference year
  let referenceYear = String(new Date().getFullYear());
  if (input.datesSouhaitees) {
    const parsed = new Date(input.datesSouhaitees);
    if (!isNaN(parsed.getTime())) referenceYear = String(parsed.getFullYear());
  }

  const fundingLabel = getFundingLabel(fundingBody);
  const montantFormation = parseFloat(input.montantFormationHT) || 0;
  const montantConsomme = input.dejaFormationCetteAnnee === "oui"
    ? parseFloat(input.montantDejaConsommeCetteAnnee) || 0
    : 0;

  // Determine cap
  let annualCapEUR: number | null = null;
  let cfpMicro: number | null = null;

  if (fundingBody === "AGEFICE_MICRO" && input.natureActiviteMicro && input.caN1) {
    const micro = computeMicroCap(input.natureActiviteMicro, parseFloat(input.caN1) || 0);
    cfpMicro = micro.cfp;
    annualCapEUR = micro.annualCap;
    if (micro.cfp > 0) {
      reasons.push(`CFP estimée : ${micro.cfp.toFixed(2)} € → plafond ${micro.annualCap} €`);
    }
  } else {
    annualCapEUR = getCapForYear(fundingBody, referenceYear);
  }

  // Compute rights
  let droitRestant: number | null = null;
  let priseEnChargeEstimee: number | null = null;
  let resteACharge: number | null = null;

  if (annualCapEUR !== null && annualCapEUR > 0) {
    droitRestant = Math.max(0, annualCapEUR - montantConsomme);
    priseEnChargeEstimee = Math.min(droitRestant, montantFormation);
    resteACharge = Math.max(0, montantFormation - priseEnChargeEstimee);
  } else if (montantFormation > 0) {
    resteACharge = montantFormation;
  }

  // Required docs
  const requiredDocs: string[] = [];

  if (fundingBody === "OPCO_EP") {
    requiredDocs.push("Bulletins de salaire (3 derniers mois)");
    requiredDocs.push("SIRET de l'employeur");
    requiredDocs.push("Informations sur l'effectif de l'agence");
  }
  if (fundingBody === "AGEFICE_MICRO" || fundingBody === "FAF_A_CONFIRMER" || fundingBody === "AGEFICE") {
    if (input.siretPersonnel === "oui" || input.immatriculationRSAC === "oui") {
      requiredDocs.push("Extrait Kbis ou inscription RSAC (< 3 mois)");
    }
    requiredDocs.push("Attestation de contribution à la formation professionnelle (CFP)");
  }
  if (input.cotisationsAJour === "oui" || input.attestationUrssafCFPDisponible === "oui") {
    requiredDocs.push("Attestation URSSAF de régularité");
  }
  if (input.cotisationsAJour !== "oui") {
    requiredDocs.push("Attestation URSSAF à vérifier");
  }
  if (fundingBody === "INCONNU") {
    requiredDocs.push("Bulletins de salaire ou Kbis pour déterminer le financeur");
  }
  requiredDocs.push("Devis ou convention de formation");
  requiredDocs.push("Programme détaillé de la formation");

  return {
    fundingBody,
    fundingLabel,
    confidence,
    referenceYear,
    annualCapEUR,
    cfpMicro,
    montantConsomme,
    droitRestant,
    priseEnChargeEstimee,
    resteACharge,
    montantFormation,
    reasons,
    requiredDocs,
    ruleVersion: RULES_VERSION,
    computedAt: new Date().toISOString(),
  };
}
