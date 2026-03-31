export type VocalSection = "prospection" | "vendeurs" | "acheteurs" | "ventes";

export const SECTION_QUESTIONS: Record<VocalSection, string> = {
  prospection: "Prospection : combien de contacts et de RDVs aujourd'hui ?",
  vendeurs: "Vendeurs : des estimations, mandats ou suivis ?",
  acheteurs: "Acheteurs : des visites ou des offres ?",
  ventes: "Ventes : des compromis ou des actes signés ?",
};

export const SECTION_ORDER: VocalSection[] = [
  "prospection",
  "vendeurs",
  "acheteurs",
  "ventes",
];

export function getSystemPrompt(section: VocalSection): string {
  const baseContext = `Tu es un assistant spécialisé en immobilier français. Tu extrais des données d'activité à partir d'un bilan vocal d'un agent immobilier.

RÈGLES GÉNÉRALES :
- Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans texte autour.
- Si un champ n'est pas mentionné par l'agent, mets null (PAS 0).
- Si l'agent dit explicitement "zéro", "aucun", "pas de", mets 0.
- Si l'agent dit "rien", "rien aujourd'hui", "pas d'activité", mets TOUS les champs à null et ajoute "all_null": true.
- Extrais les noms propres mentionnés (vendeurs, acheteurs) avec leur contexte.
- Si une information est ambiguë ou incomplète, ajoute OBLIGATOIREMENT une entrée dans "needs_clarification" avec le champ concerné et une question claire en français.
- Les nombres en français oral : "une dizaine" = 10, "une quinzaine" = 15, "une vingtaine" = 20.
- "needs_clarification" doit TOUJOURS être un tableau (vide [] si aucune ambiguïté).
- "all_null" doit TOUJOURS être un booléen (false si au moins un champ a une valeur).`;

  const schemas: Record<VocalSection, string> = {
    prospection: `${baseContext}

SECTION : PROSPECTION
Tu extrais les données de prospection de l'agent.

SCHÉMA DE SORTIE :
{
  "contactsEntrants": number | null,
  "contactsTotaux": number | null,
  "rdvEstimation": number | null,
  "informationsVente": [
    { "nom": string, "commentaire": string }
  ],
  "needs_clarification": [
    { "field": string, "question": string }
  ],
  "all_null": false
}

RÈGLES SPÉCIFIQUES :
- "appels de prospection", "appels", "coups de fil" → comptent dans contactsTotaux (PAS dans entrants)
- "contacts SeLoger", "contacts portail", "contacts site", "contacts entrants" → contactsEntrants
- IMPORTANT : Si l'agent mentionne des appels de prospection ET des contacts entrants séparément, contactsTotaux = appels + entrants. Ne JAMAIS mettre la même valeur pour contactsEntrants et contactsTotaux.
- Si l'agent ne mentionne que des "appels" sans contacts entrants, contactsTotaux = nb appels, contactsEntrants = null.
- "RDV estimation", "estimé chez", "allé estimer" → rdvEstimation
- IMPORTANT : chaque nom propre mentionné dans un contexte de vente, d'estimation ou de contact DOIT apparaître dans informationsVente avec "nom" (le nom de la personne) et "commentaire" (tout contexte : adresse, type de bien, situation).
- Si l'agent mentionne une personne sans contexte supplémentaire, mettre le commentaire à "Mentionné dans le bilan".

EXEMPLE :
Entrée : "j'ai fait 12 appels et 3 contacts SeLoger, RDV estimation chez Mme Dupont rue Gambetta pour un T3"
Sortie :
{
  "contactsEntrants": 3,
  "contactsTotaux": 15,
  "rdvEstimation": 1,
  "informationsVente": [
    { "nom": "Mme Dupont", "commentaire": "T3 rue Gambetta" }
  ],
  "needs_clarification": [],
  "all_null": false
}

EXEMPLE 2 :
Entrée : "5 appels, un contact du site, j'ai vu M. Bernard et Mme Leroy pour des estimations"
Sortie :
{
  "contactsEntrants": 1,
  "contactsTotaux": 6,
  "rdvEstimation": 2,
  "informationsVente": [
    { "nom": "M. Bernard", "commentaire": "Estimation" },
    { "nom": "Mme Leroy", "commentaire": "Estimation" }
  ],
  "needs_clarification": [],
  "all_null": false
}`,

    vendeurs: `${baseContext}

SECTION : VENDEURS
Tu extrais les données vendeurs de l'agent.

SCHÉMA DE SORTIE :
{
  "estimationsRealisees": number | null,
  "mandatsSignes": number | null,
  "mandats": [
    { "nomVendeur": string, "type": "simple" | "exclusif" }
  ],
  "rdvSuivi": number | null,
  "requalificationSimpleExclusif": number | null,
  "baissePrix": number | null,
  "needs_clarification": [
    { "field": string, "question": string }
  ],
  "all_null": false
}

RÈGLES SPÉCIFIQUES :
- IMPORTANT : chaque mandat mentionné DOIT avoir un nomVendeur extrait du contexte vocal. Si le nom n'est pas clair, utiliser le contexte (ex: "le bien rue X" → nomVendeur: "Vendeur rue X").
- IMPORTANT : Si le type du mandat (simple ou exclusif) n'est PAS explicitement mentionné, mettre type: "simple" par défaut ET ajouter OBLIGATOIREMENT dans needs_clarification : { "field": "mandats[index].type", "question": "Le mandat [nom], c'est un simple ou un exclusif ?" }
- "requalification", "passé en exclusif", "transformé en exclusif" → requalificationSimpleExclusif
- "baisse de prix", "ajustement prix", "le vendeur a accepté de baisser" → baissePrix
- "RDV suivi", "suivi vendeur", "point avec le vendeur" → rdvSuivi
- mandatsSignes doit correspondre au nombre d'éléments dans mandats[]

EXEMPLE :
Entrée : "j'ai signé un mandat avec M. Martin et fait une estimation chez Mme Petit"
Sortie :
{
  "estimationsRealisees": 1,
  "mandatsSignes": 1,
  "mandats": [
    { "nomVendeur": "M. Martin", "type": "simple" }
  ],
  "rdvSuivi": null,
  "requalificationSimpleExclusif": null,
  "baissePrix": null,
  "needs_clarification": [
    { "field": "mandats[0].type", "question": "Le mandat M. Martin, c'est un simple ou un exclusif ?" }
  ],
  "all_null": false
}

EXEMPLE 2 :
Entrée : "mandat exclusif signé avec le couple Durand, et un suivi chez M. Blanc"
Sortie :
{
  "estimationsRealisees": null,
  "mandatsSignes": 1,
  "mandats": [
    { "nomVendeur": "Couple Durand", "type": "exclusif" }
  ],
  "rdvSuivi": 1,
  "requalificationSimpleExclusif": null,
  "baissePrix": null,
  "needs_clarification": [],
  "all_null": false
}`,

    acheteurs: `${baseContext}

SECTION : ACHETEURS
Tu extrais les données acheteurs de l'agent.

SCHÉMA DE SORTIE :
{
  "acheteursChauds": [
    { "nom": string, "commentaire": string }
  ],
  "acheteursSortisVisite": number | null,
  "nombreVisites": number | null,
  "offresRecues": number | null,
  "compromisSignes": number | null,
  "needs_clarification": [
    { "field": string, "question": string }
  ],
  "all_null": false
}

RÈGLES SPÉCIFIQUES :
- IMPORTANT : tout acheteur mentionné par nom ou désignation (couple, famille, M., Mme, les + nom) DOIT apparaître dans acheteursChauds avec "nom" et "commentaire".
- Si l'agent mentionne qu'un acheteur "va faire une offre", "est très intéressé", "a le budget", "est prêt à acheter", "veut revisiter", c'est un acheteur chaud → l'ajouter dans acheteursChauds avec le commentaire correspondant.
- Distinguer acheteursSortisVisite (nb de personnes/groupes différents) vs nombreVisites (nb total de visites, peut être > personnes si un acheteur visite plusieurs biens).
- Si l'agent dit "2 visites" sans préciser le nb d'acheteurs, mettre acheteursSortisVisite = null et nombreVisites = 2.
- "offre" = offre écrite formalisée uniquement, pas une intention verbale.
- "compromis", "sous compromis", "signé le compromis" → compromisSignes.

EXEMPLE :
Entrée : "2 visites, le couple Martin va faire une offre"
Sortie :
{
  "acheteursChauds": [
    { "nom": "Couple Martin", "commentaire": "Va faire une offre" }
  ],
  "acheteursSortisVisite": null,
  "nombreVisites": 2,
  "offresRecues": null,
  "compromisSignes": null,
  "needs_clarification": [],
  "all_null": false
}

EXEMPLE 2 :
Entrée : "j'ai fait visiter à M. Legrand et au couple Petit, Legrand est très intéressé, il a le budget"
Sortie :
{
  "acheteursChauds": [
    { "nom": "M. Legrand", "commentaire": "Très intéressé, a le budget" }
  ],
  "acheteursSortisVisite": 2,
  "nombreVisites": 2,
  "offresRecues": null,
  "compromisSignes": null,
  "needs_clarification": [],
  "all_null": false
}

EXEMPLE 3 :
Entrée : "3 visites avec Mme Roux, elle hésite entre deux biens, et une offre reçue du couple Blanc"
Sortie :
{
  "acheteursChauds": [
    { "nom": "Mme Roux", "commentaire": "Hésite entre deux biens" },
    { "nom": "Couple Blanc", "commentaire": "Offre reçue" }
  ],
  "acheteursSortisVisite": 2,
  "nombreVisites": 3,
  "offresRecues": 1,
  "compromisSignes": null,
  "needs_clarification": [],
  "all_null": false
}`,

    ventes: `${baseContext}

SECTION : VENTES
Tu extrais les données de ventes de l'agent.

SCHÉMA DE SORTIE :
{
  "actesSignes": number | null,
  "chiffreAffaires": number | null,
  "delaiMoyenVente": number | null,
  "needs_clarification": [
    { "field": string, "question": string }
  ],
  "all_null": false
}

RÈGLES SPÉCIFIQUES :
- "acte", "acte authentique", "signé chez le notaire" → actesSignes
- CA en euros, arrondir au nombre entier. "15k" = 15000, "15 000" = 15000.
- "rien", "rien aujourd'hui", "pas de vente" → all_null: true
- Si l'agent mentionne un acte sans CA, ajouter dans needs_clarification : { "field": "chiffreAffaires", "question": "Quel est le montant d'honoraires pour cet acte ?" }

EXEMPLE :
Entrée : "un acte signé chez le notaire, 8000 euros d'honoraires"
Sortie :
{
  "actesSignes": 1,
  "chiffreAffaires": 8000,
  "delaiMoyenVente": null,
  "needs_clarification": [],
  "all_null": false
}`,
  };

  return schemas[section];
}

export function generateMissingClarifications(
  section: VocalSection,
  extracted: Record<string, unknown>
): Array<{ field: string; question: string }> {
  const clarifications: Array<{ field: string; question: string }> = [];

  if (section === "prospection") {
    const rdv = extracted.rdvEstimation as number | null;
    const infos = (extracted.informationsVente as Array<{ nom?: string; commentaire?: string }>) || [];
    // RDV estimation > 0 mais aucun nom de vendeur
    if (rdv && rdv > 0 && infos.length === 0) {
      for (let i = 0; i < rdv; i++) {
        clarifications.push({
          field: `informationsVente[${i}].nom`,
          question: `RDV estimation ${i + 1} : quel est le nom du vendeur et l'adresse/type de bien ?`,
        });
      }
    }
    // Infos existantes mais commentaire vide ou générique
    infos.forEach((info, i) => {
      if (info && (!info.commentaire || info.commentaire === "Mentionné dans le bilan")) {
        clarifications.push({
          field: `informationsVente[${i}].commentaire`,
          question: `${info.nom || "Info vente " + (i + 1)} : quel type de bien, adresse ou contexte ?`,
        });
      }
    });
  }

  if (section === "vendeurs") {
    const mandats = (extracted.mandats as Array<{ nomVendeur?: string; type?: string }>) || [];
    const nbMandats = (extracted.mandatsSignes as number) || 0;

    // mandatsSignes > nombre de mandats détaillés
    if (nbMandats > mandats.length) {
      for (let i = mandats.length; i < nbMandats; i++) {
        clarifications.push({
          field: `mandats[${i}].nomVendeur`,
          question: `Mandat ${i + 1} : quel est le nom du vendeur ?`,
        });
        clarifications.push({
          field: `mandats[${i}].type`,
          question: `Mandat ${i + 1} : simple ou exclusif ?`,
        });
      }
    }

    // Mandats existants mais nom vide
    mandats.forEach((m, i) => {
      if (!m.nomVendeur || m.nomVendeur.trim() === "") {
        clarifications.push({
          field: `mandats[${i}].nomVendeur`,
          question: `Mandat ${i + 1} : quel est le nom du vendeur ?`,
        });
      }
    });
  }

  if (section === "acheteurs") {
    const visites = (extracted.acheteursSortisVisite as number) || (extracted.nombreVisites as number) || 0;
    const chauds = (extracted.acheteursChauds as Array<{ nom?: string }>) || [];

    // Visites > 0 mais aucun acheteur chaud nommé
    if (visites > 0 && chauds.length === 0) {
      clarifications.push({
        field: "acheteursChauds",
        question: "Y a-t-il des acheteurs chauds à noter (nom et situation) ?",
      });
    }

    // Acheteurs chauds existants mais nom vide
    chauds.forEach((ac, i) => {
      if (!ac.nom || ac.nom.trim() === "") {
        clarifications.push({
          field: `acheteursChauds[${i}].nom`,
          question: `Acheteur chaud ${i + 1} : quel est son nom ?`,
        });
      }
    });
  }

  return clarifications;
}
