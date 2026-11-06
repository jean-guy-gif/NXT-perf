/**
 * Interrupteur global des fonctionnalités IA.
 *
 * Par défaut, AUCUN appel IA n'est émis : les deux interrupteurs sont éteints.
 *
 * - Serveur : `isAiEnabled()` garde les routes API qui appellent le LLM
 *   (OpenRouter). Activé via `AI_FEATURES_ENABLED=true`.
 * - Client : `isAiVisible()` masque les boutons / composants qui déclenchent
 *   ces routes. Activé via `NEXT_PUBLIC_AI_FEATURES=on`.
 *
 * Les deux sont indépendants : le serveur peut rester éteint même si l'UI
 * est visible (une route renverra alors 503 { disabled: true }).
 */

/** Côté serveur — autorise réellement les appels LLM. Éteint par défaut. */
export function isAiEnabled(): boolean {
  return process.env.AI_FEATURES_ENABLED === "true";
}

/** Côté client — affiche les entrées UI qui déclenchent l'IA. Éteint par défaut. */
export function isAiVisible(): boolean {
  return process.env.NEXT_PUBLIC_AI_FEATURES === "on";
}
