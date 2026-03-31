const ADJECTIVES = [
  "Rapide", "Solide", "Brillant", "Agile", "Expert",
  "Précis", "Stable", "Fiable", "Vif", "Robuste",
];

const NOUNS = [
  "Mandat", "Vente", "Client", "Bureau", "Contrat",
  "Marché", "Réseau", "Vision", "Projet", "Équipe",
];

const SYMBOLS = ["!", "@", "#", "$", "%", "&", "*", "?"];

export function generateSecurePassword(): string {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num  = Math.floor(Math.random() * 90) + 10;
  const sym  = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  return `${adj}${noun}${num}${sym}`;
}

export interface PasswordStrength {
  score: number; // 0–5
  label: string;
  color: "red" | "amber" | "green";
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "", color: "red" };

  let score = 0;
  if (password.length >= 8)            score++;
  if (password.length >= 12)           score++;
  if (/[A-Z]/.test(password))         score++;
  if (/[0-9]/.test(password))         score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: score === 0 ? "Très faible" : "Faible", color: "red" };
  if (score === 3) return { score, label: "Moyen", color: "amber" };
  return { score, label: score === 4 ? "Fort" : "Très fort", color: "green" };
}
