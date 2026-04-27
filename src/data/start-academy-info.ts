/**
 * Coordonnées officielles Start Academy (organisme de formation).
 * Source de vérité unique pour :
 * - Auto-remplissage Section 4 du CERFA AGEFICE
 * - Affichage dans le wizard formation
 * - Tout autre besoin produit (factures, mentions légales, etc.)
 *
 * À mettre à jour ici si les coordonnées changent (déménagement, changement de responsable, etc.)
 */
export const START_ACADEMY_INFO = {
  raisonSociale: "SASU Start Academy",
  formeJuridique: "SASU",
  siret: "95131909400011",
  siren: "951319094",
  nda: "93 06 104 81 06",
  codeApe: "85.59A",
  capital: 10,
  rcs: "Grasse",
  adresse: "618 boulevard Jean Maurel inférieur",
  codePostal: "06140",
  ville: "VENCE",
  // Responsable / Contact (identiques selon exemple Bellus signé)
  responsable: {
    civilite: "M" as const,
    nom: "LAFITTE",
    prenom: "JULIEN",
    telephone: "0622806509",
    email: "julien@start-academy.fr",
  },
  contact: {
    civilite: "M" as const,
    nom: "LAFITTE",
    prenom: "JULIEN",
    telephone: "0622806509",
    email: "julien@start-academy.fr",
  },
  // Contact général Start Academy (différent du contact CERFA)
  contactGeneral: {
    telephone: "0610230060",
    email: "formation@start-academy.fr",
  },
} as const;

/**
 * Détermine si une chaîne d'organisme correspond à Start Academy.
 * Match insensitive + trim + variantes courantes.
 */
export function isStartAcademy(organisme: string | undefined | null): boolean {
  if (!organisme) return true; // default V1 wizard = Start Academy
  const normalized = organisme.trim().toLowerCase();
  return (
    normalized === "" ||
    normalized === "start academy" ||
    normalized === "sasu start academy" ||
    normalized.includes("start-academy") ||
    normalized.includes("startacademy")
  );
}
