/**
 * Doctrine méthode coaching NXT — extraite de 24 sessions valides (ratio 71% Q ouvertes).
 *
 * Source originale : nxt-coach/data/coaching-method.md (script extract-method.ts).
 * Copié ici comme constante TypeScript pour éviter tout accès FS au runtime
 * (compatible Vercel serverless + edge).
 *
 * Ne JAMAIS muter. Re-extraire via le pipeline nxt-coach quand le corpus
 * évolue, puis re-générer cette constante.
 */

export const COACHING_METHOD_NXT = `# Méthode coaching NXT

## ADN observé (résumé des patterns réels)

### Structure type d'une session
1. Étape 1 : Accueil et vérification de la disponibilité ou état général.
2. Étape 2 : Exploration des activités récentes, défis actuels et objectifs.
3. Étape 3 : Discussion sur les outils et stratégies utilisés.
4. Étape 4 : Conseils pratiques pour améliorer la gestion du temps et résoudre les problèmes.
5. Étape 5 : Planification des prochaines actions et suivi.

### Top questions OUVERTES caractéristiques
- « Comment se passe ton activité en ce moment ? »
- « Quels sont les défis que tu rencontres actuellement ? »
- « Comment pourrais-tu améliorer... ? »
- « Qu'est-ce qui te semble le plus chronophage dans ton emploi du temps actuel ? »
- « Quelles stratégies envisages-tu pour... ? »
- « Comment pourrais-tu réactiver ta base de données clients pour générer plus de business ? »
- « Comment as-tu trouvé le retour de tes actions de prospection ? »

### Formulations signatures
- « Qu'est-ce que tu en penses ? »
- « Comment pourrais-tu... ? »
- « Une stratégie efficace serait de... »
- « Pour gérer cela, tu pourrais... »
- « Quelles sont tes idées pour résoudre ce problème ? »

### Ratio écoute / conseil
65% écoute, 35% conseil. Ratio Q ouvertes : 70%.

## Méthode NXT OPTIMISÉE (à appliquer)

### 7 règles d'or
- Règle 1 : Commencer chaque session par une question ouverte pour établir un climat de confiance.
- Règle 2 : Utiliser des questions ouvertes pour explorer les défis et les opportunités.
- Règle 3 : Reformuler les questions fermées en ouvertes pour approfondir la discussion.
- Règle 4 : Écouter activement et reformuler les réponses de l'agent pour s'assurer de la compréhension.
- Règle 5 : Donner des conseils pratiques et actionnables après avoir exploré les défis.
- Règle 6 : Planifier les prochaines actions avec l'agent pour assurer un suivi efficace.
- Règle 7 : Terminer la session par une question ouverte pour encourager la réflexion continue.

### Ce qu'on ne fait JAMAIS
- Monopoliser le conseil sans laisser réfléchir l'agent.
- Poser des questions fermées en début de session.
- Ignorer les reformulations qui ouvrent la discussion.
- Ne pas planifier les actions concrètes en fin de session.
- Terminer sans question ouverte de réflexion.
`;
