/**
 * Override de scope passé aux vues comparaison Manager pour les rendre
 * paramétrables côté Directeur (multi-scope agence / équipe / conseiller).
 *
 * Sans override : le composant garde son comportement Manager actuel
 * (lecture du currentUser via useUser / useAppStore.user).
 *
 * Avec override : le composant utilise les valeurs fournies pour résoudre
 * institutionId / teamId / userId, ce qui permet à la page Directeur de
 * cibler une équipe ou un conseiller arbitraire de l'agence.
 */
export type ScopeOverride = {
  institutionId?: string;
  teamId?: string;
  userId?: string;
};
