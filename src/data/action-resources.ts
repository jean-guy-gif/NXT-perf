export interface ActionResource {
  /** Matching sur le titre de l'action (lower case contains) */
  actionTitleMatch: string;
  title: string;
  content: string;
  isPlaceholder: boolean;
}

// Exemple réel rédigé pour démontrer à quoi ressemble une vraie fiche
const SCRIPT_APPEL_ESTIMATION: ActionResource = {
  actionTitleMatch: "contacter les prospects",
  title: "Script d'appel : prise de rendez-vous estimation",
  content: `# Script d'appel — Prise de RDV estimation

## Contexte d'usage

Utilise ce script pour transformer un lead entrant ou un contact tiède en rendez-vous d'estimation physique. Durée cible : 3 à 5 minutes.

## Étape 1 — Accroche (15 secondes)

"Bonjour [Prénom], c'est [Ton nom] de l'agence [Nom]. Je reviens vers toi concernant ton projet de vente à [quartier/ville]. Tu as 2 minutes ?"

**Pourquoi ça marche** : tu ne demandes pas la permission de parler, tu la prends avec un horizon court qui rassure.

## Étape 2 — Découverte rapide (1 minute)

3 questions à poser dans cet ordre :

- "Tu en es où de ta réflexion ?"
- "Quelle est ton échéance idéale pour vendre ?"
- "As-tu déjà rencontré d'autres agences ?"

**Note les réponses** : elles détermineront ton angle lors du RDV.

## Étape 3 — Proposition d'estimation (30 secondes)

"Ce que je te propose : je viens chez toi 45 minutes, je te donne une estimation précise avec 3 biens comparables vendus récemment dans ton quartier, et je te partage ma stratégie pour vendre au meilleur prix dans ton délai. C'est gratuit et sans engagement. Ça t'intéresse ?"

## Étape 4 — Close sur le créneau (15 secondes)

Ne demande JAMAIS "quand es-tu disponible ?" — propose toujours 2 créneaux.

"Je te propose soit [Jour1] à [Heure1], soit [Jour2] à [Heure2]. Lequel te va le mieux ?"

## Objections fréquentes et réponses types

**"Je ne suis pas encore décidé"**
→ "C'est justement pour ça que je viens : tu auras toutes les infos pour décider. Tu pourras arrêter après si tu veux."

**"J'ai déjà vu 2 agences"**
→ "Parfait, tu vas pouvoir comparer. Mon approche est différente, on va en parler 45 minutes. Lequel des 2 créneaux te convient ?"

**"Envoie-moi plutôt une estimation par mail"**
→ "Je ne peux pas être précis à distance — et surtout, on a besoin de définir ensemble ta stratégie de vente. 45 minutes chez toi c'est plus efficace. Lequel des 2 créneaux ?"

## À éviter absolument

- Les questions fermées trop tôt ("tu veux un RDV ?")
- Les monologues sur l'agence
- Parler de commissions au téléphone
- Laisser plus de 24h entre l'appel et le RDV

## Checklist avant l'appel

- Tu as relu sa fiche contact et ses précédents échanges
- Tu as 2 créneaux précis en tête
- Tu es dans un endroit calme
- Tu es debout (ta voix porte mieux)
`,
  isPlaceholder: false,
};

const DEFAULT_PLACEHOLDER: ActionResource = {
  actionTitleMatch: "",
  title: "Ressource en préparation",
  content: "",
  isPlaceholder: true,
};

const RESOURCES: ActionResource[] = [SCRIPT_APPEL_ESTIMATION];

export function findResourceForAction(actionTitle: string): ActionResource {
  const lowerTitle = actionTitle.toLowerCase();
  const match = RESOURCES.find((r) =>
    lowerTitle.includes(r.actionTitleMatch.toLowerCase())
  );
  return match ?? { ...DEFAULT_PLACEHOLDER, title: `Fiche : ${actionTitle}` };
}
