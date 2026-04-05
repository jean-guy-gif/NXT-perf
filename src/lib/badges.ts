export interface BadgeDefinition {
  key: string;
  emoji: string;
  name: string;
  description: string;
  category: "demarrage" | "regularite" | "performance" | "social" | "formation";
}

export const BADGES = {
  premier_pas: { key: "premier_pas", emoji: "\u{1F3AF}", name: "Premier Pas", description: "Première saisie validée", category: "demarrage" },
  visage_reussite: { key: "visage_reussite", emoji: "\u{1F4F8}", name: "Visage de la réussite", description: "Photo de profil ajoutée", category: "demarrage" },
  fier_agence: { key: "fier_agence", emoji: "\u{1F3E2}", name: "Fier de mon agence", description: "Logo agence uploadé", category: "demarrage" },
  ma_voix: { key: "ma_voix", emoji: "\u{1F3A4}", name: "Ma voix, mon style", description: "Voix coach choisie", category: "demarrage" },
  archiviste: { key: "archiviste", emoji: "\u{1F4E5}", name: "L'archiviste", description: "Premier import de données", category: "demarrage" },
  en_feu: { key: "en_feu", emoji: "\u{1F525}", name: "En feu", description: "4 saisies consécutives (1 mois)", category: "regularite" },
  diamant: { key: "diamant", emoji: "\u{1F48E}", name: "Diamant", description: "12 saisies consécutives (1 trimestre)", category: "regularite" },
  legende: { key: "legende", emoji: "\u{1F3C6}", name: "Légende", description: "52 saisies consécutives (1 an)", category: "regularite" },
  sniper: { key: "sniper", emoji: "\u{1F3AF}", name: "Sniper", description: "Taux de transformation mandat > 30%", category: "performance" },
  fusee: { key: "fusee", emoji: "\u{1F680}", name: "Fusée", description: "+50% de CA vs mois précédent", category: "performance" },
  six_chiffres: { key: "six_chiffres", emoji: "\u{1F4B0}", name: "6 chiffres", description: "CA annuel > 100 000\u20AC", category: "performance" },
  hat_trick: { key: "hat_trick", emoji: "\u{1F31F}", name: "Hat-trick", description: "3 actes signés dans la même semaine", category: "performance" },
  chef_meute: { key: "chef_meute", emoji: "\u{1F465}", name: "Chef de meute", description: "5 conseillers dans son équipe", category: "social" },
  ambassadeur: { key: "ambassadeur", emoji: "\u{1F4E8}", name: "Ambassadeur", description: "3 conseillers ont rejoint via son code", category: "social" },
  analyste: { key: "analyste", emoji: "\u{1F52C}", name: "Analyste", description: "DPI complété avec score > 70%", category: "formation" },
} as const satisfies Record<string, BadgeDefinition>;

export type BadgeKey = keyof typeof BADGES;

export const BADGE_CATEGORIES = [
  { key: "demarrage", label: "Démarrage" },
  { key: "regularite", label: "Régularité" },
  { key: "performance", label: "Performance" },
  { key: "social", label: "Social" },
  { key: "formation", label: "Formation" },
] as const;
