/**
 * Anonymisation regex (PR-C V1).
 *
 * Premier filet de sécurité avant l'extraction LLM. NE garantit PAS une
 * anonymisation complète — sert à neutraliser les patterns évidents
 * (emails, téléphones FR, adresses, civilités+nom). L'anonymisation
 * définitive intervient par construction au stade extraction : le LLM
 * reçoit une consigne stricte de produire des patterns GÉNÉRIQUES, sans
 * citer noms/lieux/dates.
 *
 * Principe : remplacer par des placeholders neutres (`[ANONYME]`,
 * `[EMAIL]`, etc.) plutôt que supprimer — préserve le contexte sémantique
 * pour le LLM.
 *
 * Une couche LLM-scrub additionnelle est différée (PR ultérieure) si la
 * V1 laisse passer trop de PII résiduel.
 */

const PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
  // Emails
  { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replacement: "[EMAIL]" },

  // Téléphones FR (10 chiffres avec/sans séparateurs ; format intl +33)
  {
    regex: /(\+33|0)[\s.-]?[1-9](?:[\s.-]?\d{2}){4}\b/g,
    replacement: "[TEL]",
  },

  // Civilités + nom propre suivant (M. Dupont, Mme Martin, Madame Durand…)
  {
    regex: /\b(M\.|Mme|Mlle|Monsieur|Madame|Mademoiselle)\s+[A-ZÉÈÀÇÊ][\wéèàçêîôû'-]+(\s+[A-ZÉÈÀÇÊ][\wéèàçêîôû'-]+)?/g,
    replacement: "[ANONYME]",
  },

  // "M./Mme NOM" abrégé tout en majuscules
  {
    regex: /\b(M|MME|MLLE)\.?\s+[A-ZÉÈÀÇÊ]{2,}\b/g,
    replacement: "[ANONYME]",
  },

  // Adresses fréquentes (rue, avenue, boulevard, impasse + nom)
  {
    regex: /\b(rue|avenue|av\.|boulevard|bd|impasse|allée|place|chemin)\s+(de\s+|du\s+|des\s+|d['']\s*)?[A-ZÉÈÀÇÊ][\wéèàçêîôû'\s-]{2,40}/gi,
    replacement: "[ADRESSE]",
  },

  // Codes postaux FR + ville
  {
    regex: /\b\d{5}\s+[A-ZÉÈÀÇÊ][\wéèàçêîôû'-]+(\s+[A-ZÉÈÀÇÊ][\wéèàçêîôû'-]+)?/g,
    replacement: "[CP_VILLE]",
  },

  // Montants spécifiques en € (préserve les ordres de grandeur)
  {
    regex: /\b\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?\s*€/g,
    replacement: "[MONTANT]",
  },

  // URLs (potentiellement personnalisées avec pseudo / agence)
  {
    regex: /\bhttps?:\/\/[^\s)]+/g,
    replacement: "[URL]",
  },
];

/**
 * Applique l'anonymisation regex sur un texte. Idempotent : si déjà
 * anonymisé, ne change rien.
 */
export function anonymize(text: string): string {
  let out = text;
  for (const { regex, replacement } of PATTERNS) {
    out = out.replace(regex, replacement);
  }
  return out;
}

/**
 * Compte les substitutions effectuées (utile pour log/debug).
 */
export function anonymizeWithStats(text: string): {
  text: string;
  substitutions: number;
} {
  let count = 0;
  let out = text;
  for (const { regex, replacement } of PATTERNS) {
    out = out.replace(regex, () => {
      count += 1;
      return replacement;
    });
  }
  return { text: out, substitutions: count };
}
