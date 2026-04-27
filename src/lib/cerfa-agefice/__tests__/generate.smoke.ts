/**
 * Test smoke isolé : vérifie que generateCerfaPdf charge le PDF source,
 * remplit les champs et produit un PDF valide.
 *
 * Cas #1 — input CerfaInput direct (Bellus, données complètes)
 * Cas #2 — AgeficeDraft minimal mappé via mapDraftToCerfaInput (V1 wizard 3 étapes)
 * Cas #3 — AgeficeDraft enrichi V1.5 (10 nouveaux champs entreprise + identité)
 *
 * Exécution :
 *   npx tsx src/lib/cerfa-agefice/__tests__/generate.smoke.ts
 *
 * Output :
 *   /tmp/agefice-test.pdf      (cas #1, données complètes Bellus)
 *   /tmp/agefice-test-v2.pdf   (cas #2, mapping AgeficeDraft V1 + auto Start Academy)
 *   /tmp/agefice-test-v3.pdf   (cas #3, mapping AgeficeDraft V1.5 enrichi — ~44 champs)
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { generateCerfaPdf } from "../generate";
import { mapDraftToCerfaInput } from "../from-draft";
import type { CerfaInput } from "../types";
import { emptyAgeficeDraft, type AgeficeDraft } from "@/lib/plan-storage";

async function main() {
  const pdfPath = join(process.cwd(), "public/cerfa/agefice-2025-2026.pdf");
  const pdfBytes = readFileSync(pdfPath);

  // ────────────────────────────────────────────────────────────────────
  // Cas #1 — données complètes (Bellus signé)
  // ────────────────────────────────────────────────────────────────────
  const input: CerfaInput = {
    pta: {
      nom: "CPME 34",
      numero: "533",
      interlocuteur: "Ahlem Hedhibi",
    },
    entreprise: {
      raisonSociale: "William BELLUS",
      nomCommercial: "William BELLUS Entreprise Individuelle",
      codeApeNaf: "4619B",
      siret: "40819463700042",
      activitePrincipale: "Immobilier",
      formeJuridique: "Entreprise individuelle",
      adresse: "Res le St Brice AppB23 130 rue de Palombe",
      codePostal: "34670",
      ville: "ST BRES",
    },
    participant: {
      civilite: "M",
      nom: "BELLUS",
      prenom: "William",
      nomNaissance: "BELLUS",
      dateNaissance: "08/01/1965",
      numeroSecuriteSociale: "1650112145011",
      telephone: "0674943395",
      email: "william@imagimmo-mauguio.com",
      dernierDiplome: "BEP-CAP",
      ancienneteDirigeant: "plus_10_ans",
    },
    organismeFormation: {
      raisonSociale: "SASU Start Academy",
      nda: "93 06 104 81 06",
      siret: "95131909400011",
      adresse: "618 boulevard Jean Maurel inférieur",
      codePostal: "06140",
      ville: "VENCE",
      responsable: {
        civilite: "M",
        nom: "LAFITTE",
        prenom: "JULIEN",
        telephone: "0622806509",
        email: "julien@start-academy.fr",
      },
      contact: {
        civilite: "M",
        nom: "LAFITTE",
        prenom: "JULIEN",
        telephone: "0622806509",
        email: "julien@start-academy.fr",
      },
    },
    formation: {
      type: "action",
      obligatoire: false,
      intitule: "Optimiser l'immobilier grâce à l'Intelligence Artificielle",
      thematique: "Immobilier",
      module: "perfectionnement",
      qualification: "sans",
      dateDebut: "09/01/2025",
      dateFin: "17/01/2025",
      dureePresentielCollectif: 53,
      nomFormateur: "Laurent Marx",
      codePostalLieu: "34430",
      villeLieu: "SAINT JEAN DE VEDAS",
      prixHt: 1885,
      formationEnEntreprise: false,
      nomAdresseLieuExacte: "Salle de réunion du restaurant LA BOUCHERIE  ZA des Peyrières  Allée Jean Monnet",
    },
    modalites: {
      evaluation: { quiz: true },
      certification: { attestationStage: true },
    },
    signature: {
      mandat: true,
      lieuSignature: "Vence",
      dateSignature: "09/12/2024",
    },
  };

  console.log("[TEST 1] Génération CERFA (données complètes Bellus)...");
  const filledPdf1 = await generateCerfaPdf(input, pdfBytes);
  const outputPath1 = "/tmp/agefice-test.pdf";
  writeFileSync(outputPath1, filledPdf1);
  console.log(`[TEST 1] ✓ PDF généré : ${outputPath1} (${filledPdf1.length} bytes)`);

  // ────────────────────────────────────────────────────────────────────
  // Cas #2 — AgeficeDraft minimaliste représentatif du wizard V1
  // (simule un conseiller micro-entrepreneur qui passe par Start Academy)
  // ────────────────────────────────────────────────────────────────────
  const minimalDraft: AgeficeDraft = {
    // Step 1 — Préqualification
    statut: "independant",
    bulletinsSalaireMensuels: "non",
    versementSalaireParAgence: "non",
    siretPersonnel: "oui",
    immatriculationRSAC: "oui",
    microEntreprise: "oui",
    cotisationsAJour: "oui",
    attestationUrssafCFPDisponible: "oui",
    tailleAgence: "1_10",
    anneeDebutActivite: "2018", // ancienneté ≈ 8 ans → "4_10_ans"
    natureActiviteMicro: "PRESTATIONS_SERVICES_LIBERAL",
    caN1: "45000",

    // Step 2 — Identité & formation
    organisme: "Start Academy", // déclenche auto-remplissage Section 4
    nom: "DUPONT",
    prenom: "Marie",
    email: "marie.dupont@example.com",
    telephone: "0612345678",
    formationChoisie: "Optimiser l'immobilier grâce à l'Intelligence Artificielle",
    datesSouhaitees: "2026-06-15", // ISO → conversion 15/06/2026

    // Step 2 — Financement
    montantFormationHT: "1885",
    dureeHeures: "21",
    dejaFormationCetteAnnee: "non",
    montantDejaConsommeCetteAnnee: "",

    // Optionnels
    codeAPE: "6831Z",
    idcc: "",
  };

  console.log("[TEST 2] Mapping AgeficeDraft → CerfaInput + génération...");
  const cerfaInput2 = mapDraftToCerfaInput(minimalDraft);
  const filledPdf2 = await generateCerfaPdf(cerfaInput2, pdfBytes);
  const outputPath2 = "/tmp/agefice-test-v2.pdf";
  writeFileSync(outputPath2, filledPdf2);
  console.log(`[TEST 2] ✓ PDF V2 généré : ${outputPath2} (${filledPdf2.length} bytes)`);
  console.log(`[TEST 2] Cas Start Academy auto-fill (Section 4 + mandat) — vérification visuelle attendue`);

  // ────────────────────────────────────────────────────────────────────
  // Cas #3 — AgeficeDraft V1.5 enrichi (10 nouveaux champs entreprise + identité)
  // Cible : ~44 champs CERFA remplis (47 % du formulaire) + 4 hardcodes Start Academy
  // ────────────────────────────────────────────────────────────────────
  const enrichedDraft: AgeficeDraft = {
    ...emptyAgeficeDraft,
    // Step 1 — Préqualification (V1)
    statut: "independant",
    bulletinsSalaireMensuels: "non",
    versementSalaireParAgence: "non",
    siretPersonnel: "oui",
    immatriculationRSAC: "oui",
    microEntreprise: "oui",
    cotisationsAJour: "oui",
    attestationUrssafCFPDisponible: "oui",
    tailleAgence: "1_10",
    anneeDebutActivite: "2018", // ancienneté ≈ 8 ans → "4_10_ans"
    natureActiviteMicro: "PRESTATIONS_SERVICES_LIBERAL",
    caN1: "45000",

    // Step 2 — Identité + formation (V1)
    organisme: "Start Academy", // déclenche auto-fill Section 4 + 4 hardcodes
    nom: "DUPONT",
    prenom: "Marie",
    email: "marie.dupont@example.com",
    telephone: "0612345678",
    formationChoisie: "Négociation et closing",
    datesSouhaitees: "2025-06-10",

    // Step 2 — Financement (V1)
    montantFormationHT: "1200",
    dureeHeures: "29",
    dejaFormationCetteAnnee: "non",
    montantDejaConsommeCetteAnnee: "",

    // Optionnels V1
    codeAPE: "68.31Z",
    idcc: "",

    // V1.5 — Identification entreprise (5 nouveaux champs)
    nomEntreprise: "Marie DUPONT Immobilier",
    codeNAF: "68.31Z",
    adresseEntreprise: "12 rue de la République",
    codePostalEntreprise: "34000",
    villeEntreprise: "MONTPELLIER",

    // V1.5 — Identité dirigeant (5 nouveaux champs)
    civilite: "MME",
    nomNaissance: "MARTIN",
    dateNaissance: "1985-03-22",
    numeroSecuriteSociale: "2 85 03 34 145 011 23",
    dernierDiplome: "Bac+3 : Licence ou maîtrise",
  };

  console.log("[TEST 3] Mapping AgeficeDraft V1.5 enrichi → CerfaInput + génération...");
  const cerfaInput3 = mapDraftToCerfaInput(enrichedDraft);
  const filledPdf3 = await generateCerfaPdf(cerfaInput3, pdfBytes);
  const outputPath3 = "/tmp/agefice-test-v3.pdf";
  writeFileSync(outputPath3, filledPdf3);
  console.log(`[TEST 3] ✓ PDF V3 généré : ${outputPath3} (${filledPdf3.length} bytes)`);
  console.log(`[TEST 3] Cible ~44 champs : entreprise complète + identité complète + Start Academy auto-fill + 4 hardcodes (Perfectionnement/Quiz/Feuilles présence/Attestation stage)`);
}

main().catch((err) => {
  console.error("[TEST] ✗ Erreur:", err);
  process.exit(1);
});
