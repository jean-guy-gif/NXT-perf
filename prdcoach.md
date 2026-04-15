# NXT Performance — PRD Refactorisé

## NXT Coach — Copilote vocal immobilier natif

Version: 2.0 refactorisée
Date: Avril 2026
Statut: Proposition de refonte complète pour implémentation V1
Produit: NXT Performance
Feature: NXT Coach — Copilote vocal conversationnel
Stack cible: Next.js 16 · TypeScript · Supabase · OpenRouter · Tailwind 4 · ElevenLabs

---

## 1. Executive summary

NXT Coach est le copilote vocal natif de NXT Performance. Son canal principal est la voix. Le conseiller parle naturellement à son coach depuis son dashboard, sans quitter son environnement de travail. Le coach écoute, comprend, structure, confirme et met à jour les indicateurs de performance sans imposer de formulaire ni de séquence administrative visible.

NXT Coach n’est pas un assistant vocal générique. C’est un moteur conversationnel immobilier spécialisé, conçu pour accomplir trois missions dans un même flux:

* capter la parole utilisateur et la transformer en informations exploitables,
* conduire un débrief hebdomadaire fluide, court et naturel,
* livrer une lecture métier immédiatement actionnable, puis proposer la bonne brique NXT si un levier clair est détecté.

### Promesse produit

Le conseiller n’ouvre pas un formulaire. Il appuie, parle, valide. En moins de 5 minutes, sa semaine est transformée en pilotage clair et en prochaines actions utiles.

### Vision en une phrase

NXT Coach transforme un débrief vocal hebdomadaire en données fiables, en lecture métier immédiate, et en opportunité de progression concrète sans casser le flux de travail du conseiller.

### Problèmes résolus

| Problème actuel                                                       | Réponse NXT Coach                                                                   |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| La saisie hebdomadaire est perçue comme une contrainte administrative | Le débrief vocal remplace la logique de formulaire par une conversation guidée      |
| Les conseillers n’ouvrent pas spontanément leurs ratios               | Le coach vient à eux via une bulle contextuelle et un dock vocal discret            |
| Les chiffres sont difficiles à interpréter                            | Le coach produit une seule lecture claire et actionnable après validation           |
| Les briques NXT sont sous-utilisées                                   | Le coach prescrit au bon moment à partir d’un signal réel, observé et contextualisé |
| Le dashboard n’est pas assez incarné                                  | Le coach installe une présence régulière, personnalisée et mémorable                |
| La voix peut être perçue comme gadget si elle est imprécise           | La donnée est confirmée avant sauvegarde et orchestrée par le backend               |

---

## 2. Principes produit voice-first

### 2.1 La voix est le canal par défaut, pas l’unique canal

Le coach est pensé d’abord pour la voix, mais doit toujours pouvoir basculer vers le texte sans rupture. Le fallback texte n’est pas une rustine technique: c’est une exigence produit.

### 2.2 Le conseiller ne parle jamais à un formulaire caché

Le coach ne déroule pas une checklist. Il mène une conversation guidée, brève, contextualisée, orientée terrain.

### 2.3 La donnée n’est jamais sauvegardée sans validation explicite

Le coach peut comprendre, compléter, estimer qu’il a assez d’éléments, mais il ne sauvegarde rien sans confirmation utilisateur.

### 2.4 Le moteur vocal n’est pas le moteur métier

La capture audio, la transcription, l’extraction KPI, la logique de confirmation, la lecture métier et la prescription sont des couches distinctes orchestrées côté serveur.

### 2.5 Le coach parle peu

Une réponse coach doit rester courte, utile, et facile à écouter. Le coach ne fait jamais de monologue.

### 2.6 Le système décide, le modèle rédige

Le LLM formule les messages du coach. Les décisions métier critiques sont prises par l’orchestrateur serveur.

### 2.7 Le produit doit inspirer confiance avant d’impressionner

La priorité n’est pas la sophistication apparente. La priorité est une boucle fiable: parler, comprendre, confirmer, sauvegarder, éclairer, proposer.

---

## 3. Contexte stratégique

### 3.1 Position dans l’écosystème NXT

NXT Coach n’est pas une brique supplémentaire. C’est la couche d’intelligence relationnelle qui relie le cockpit de pilotage, le diagnostic, les modules d’entraînement et les briques de progression.

| Brique NXT    | Rôle                    | Relation avec NXT Coach                                                   |
| ------------- | ----------------------- | ------------------------------------------------------------------------- |
| NXT DPI       | Diagnostic initial      | Le coach lit le profil et les axes faibles pour contextualiser sa lecture |
| NXT Data      | Cockpit quotidien       | Le coach alimente et commente le cockpit via le débrief vocal             |
| NXT Profiling | Analyse comportementale | Le coach peut orienter vers cette brique si le signal métier l’exige      |
| NXT Training  | Entraînement métier     | Le coach prescrit un module ciblé à partir d’un ratio observé             |
| NXT Finance   | Pilotage économique     | Hors périmètre principal V1, mais prévu dans la logique future            |
| Start Academy | Formation structurée    | Le coach peut orienter vers une montée en compétence plus fondamentale    |

### 3.2 Rôle économique

NXT Coach est un moteur d’adoption, de rétention et d’upsell. Sa prescription a de la valeur uniquement si elle est ancrée dans une observation concrète de la semaine.

### 3.3 Règle économique fondamentale

Le coach ne recommande une brique que si les trois conditions suivantes sont réunies:

1. un axe de progrès clair est détecté,
2. une brique NXT répond précisément à cet axe,
3. cette brique n’est pas déjà active dans l’abonnement utilisateur.

---

## 4. Objectifs produit V1

### 4.1 Objectif principal

Rendre le débrief hebdomadaire si simple, rapide et naturel qu’un conseiller accepte de le faire régulièrement à la voix.

### 4.2 Objectifs secondaires

* fiabiliser la capture des 11 KPI hebdomadaires,
* produire une lecture métier en moins de 10 secondes après validation,
* augmenter l’usage du dashboard via un point d’entrée incarné,
* convertir une partie des observations utiles en prescriptions pertinentes,
* installer un usage récurrent sans générer de charge mentale.

### 4.3 Non-objectifs V1

* conversation libre illimitée,
* mémoire longue entre sessions,
* coaching managérial profond,
* CRM conversationnel,
* orchestration multi-briques avancée,
* personnalisation fine du ton au-delà des 5 personas.

---

## 5. User stories

### 5.1 Conseiller immobilier

| ID    | En tant que… | Je veux…                                                          | Pour…                                                      |
| ----- | ------------ | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| US-01 | Conseiller   | parler naturellement de ma semaine                                | éviter une saisie perçue comme administrative              |
| US-02 | Conseiller   | lancer mon débrief au micro depuis le dashboard                   | gagner du temps et rester dans mon contexte de travail     |
| US-03 | Conseiller   | choisir un coach qui me correspond                                | créer une relation plus engageante                         |
| US-04 | Conseiller   | voir mes données pendant la conversation                          | comprendre ce que je mets à jour sans quitter le dashboard |
| US-05 | Conseiller   | entendre un résumé de ce que le coach a compris                   | vérifier que mes chiffres sont justes avant validation     |
| US-06 | Conseiller   | corriger une erreur facilement à la voix ou au clavier            | garder confiance dans les chiffres                         |
| US-07 | Conseiller   | recevoir une lecture claire de ma semaine                         | savoir où agir sans analyser seul                          |
| US-08 | Conseiller   | recevoir une recommandation utile seulement si elle me correspond | ne pas subir une logique publicitaire                      |
| US-09 | Conseiller   | pouvoir passer en texte à tout moment                             | rester flexible selon mon environnement                    |
| US-10 | Conseiller   | reprendre un débrief interrompu                                   | ne pas perdre ce que j’ai déjà dit                         |

### 5.2 Manager / Directeur

| ID    | En tant que… | Je veux…                                         | Pour…                                                                |
| ----- | ------------ | ------------------------------------------------ | -------------------------------------------------------------------- |
| US-11 | Manager      | voir si mes conseillers ont réalisé leur débrief | identifier les membres de l’équipe qui n’alimentent pas leur cockpit |
| US-12 | Directeur    | voir si une prescription a été émise             | suivre les besoins de progression sans lire le contenu des échanges  |
| US-13 | Manager      | rendre le débrief recommandé ou obligatoire      | adapter la discipline au niveau de maturité de l’équipe              |

---

## 6. Personas coach

### 6.1 Vue d’ensemble

Avant la première interaction complète, l’utilisateur choisit son coach. Ce choix est fait une seule fois au premier démarrage et reste modifiable dans les paramètres.

La persona influence:

* le prénom du coach,
* le registre de langage,
* le niveau d’exigence,
* le ton de la lecture,
* le style de prescription,
* la voix TTS associée.

### 6.2 Personas disponibles

| ID | Prénom | Genre           | Archétype           | Phrase signature                               | Ton                   |
| -- | ------ | --------------- | ------------------- | ---------------------------------------------- | --------------------- |
| P1 | Alex   | Neutre au choix | Warrior             | Je ne te ménage pas. Je te fais progresser.    | direct, exigeant      |
| P2 | Sacha  | Neutre au choix | Coach sportif       | On analyse, on s’entraîne, on gagne.           | énergique, challenge  |
| P3 | Léa    | Féminin         | Coach bienveillant  | Je suis là, quoi qu’il arrive dans ta semaine. | chaleureux, soutenant |
| P4 | Thomas | Masculin        | Neutre expert       | Direct, factuel, efficace.                     | analytique, précis    |
| P5 | Claire | Féminin         | Neutre bienveillant | À l’écoute, précise, sans jugement.            | calme, structuré      |

### 6.3 Règles de sélection

* écran affiché au premier déclenchement complet,
* 5 cartes avec avatar illustré, phrase signature et badge de style,
* au clic, la carte devient active,
* le bouton “Commencer avec [Prénom]” lance la session sans écran intermédiaire supplémentaire,
* le premier message est immédiatement vocalisable.

### 6.4 Règles de continuité

Si l’utilisateur change de persona, le nouveau coach reprend l’historique métier utile mais pas la personnalité du précédent. Les KPI, l’historique de progression et les prescriptions restent conservés.

---

## 7. Point d’entrée: bulle contextuelle

### 7.1 Concept

La bulle contextuelle est le principal déclencheur organique de la conversation. Elle apparaît sur le dashboard lorsqu’un signal mérite l’attention de l’utilisateur.

### 7.2 Règles d’apparition

| Condition                                        |      Délai | Priorité |
| ------------------------------------------------ | ---------: | -------- |
| Ratio en sous-performance rouge                  | 3 secondes | Haute    |
| Lundi sans débrief de la semaine précédente      | 2 secondes | Haute    |
| Retour après sauvegarde hebdomadaire             |   immédiat | Haute    |
| Ratio orange stable depuis 3 semaines            | 5 secondes | Moyenne  |
| Axe DPI le plus faible sans prescription récente | 8 secondes | Basse    |

### 7.3 Règles de comportement

* une seule bulle visible à la fois,
* durée d’affichage maximale 15 secondes,
* fermeture possible manuellement,
* pas de réapparition sur le même contexte pendant 7 jours,
* jamais affichée si une session coach est déjà active,
* jamais affichée pendant un partage d’écran ou une interaction modale critique.

### 7.4 Contenu de la bulle

La bulle affiche:

* une phrase d’accroche liée au contexte,
* l’avatar miniature et le prénom du coach,
* un bouton micro pour lancer le débrief vocal,
* un clic secondaire possible pour ouvrir en texte.

### 7.5 Exemples

| Contexte                   | Formulation                                      |
| -------------------------- | ------------------------------------------------ |
| Visites → Offres rouge     | 3 visites pour 0 offre. On regarde ça ensemble ? |
| Lundi sans débrief         | C’est lundi. Tu me racontes ta semaine ?         |
| Taux exclusivité en baisse | Ton portefeuille se fragilise. On en parle ?     |
| Après sauvegarde           | Belle semaine. Je te fais le point ?             |
| Axe DPI faible             | Ta prospection perd en efficacité. On creuse ?   |

---

## 8. Voice dock conversationnel

### 8.1 Principe

Le dashboard reste le plan principal. Le coach vocal apparaît dans un dock fixe bas d’écran. Ce dock devient le centre de pilotage de l’échange vocal sans masquer les données du conseiller.

### 8.2 Objectif UX

Permettre à l’utilisateur de parler, d’être compris, de corriger et de valider sans sortir du contexte métier.

### 8.3 Anatomie du dock

| Élément                | Position       | Description                                                      |
| ---------------------- | -------------- | ---------------------------------------------------------------- |
| Avatar coach           | gauche         | avatar + prénom                                                  |
| Message coach          | centre-gauche  | dernier message coach, une ligne principale + expansion possible |
| Sous-titre utilisateur | centre         | transcription partielle ou finale du tour utilisateur            |
| Indicateur vocal       | centre         | écoute active, traitement ou parole coach                        |
| Bouton micro           | droite         | démarrer / couper / reprendre                                    |
| Bouton clavier         | droite         | bascule texte                                                    |
| Bouton fermer          | extrême droite | ferme ou met fin à la session                                    |

### 8.4 Machine d’états UI

| État          | Description                                 |
| ------------- | ------------------------------------------- |
| idle          | aucune session affichée                     |
| prompted      | bulle affichée, session non démarrée        |
| listening     | micro actif, transcription en cours         |
| processing    | fin du tour utilisateur, traitement serveur |
| speaking      | coach en train de parler via TTS            |
| confirming    | récapitulatif des KPI compris               |
| saving        | validation et sauvegarde en cours           |
| reading       | lecture rapide de la semaine                |
| prescribing   | carte de recommandation affichée            |
| fallback_text | session active sans voix                    |
| closed        | session terminée                            |

### 8.5 Règles vocales UX

* une seule question par tour coach,
* aucune réponse coach supérieure à 12 secondes audio en V1,
* l’utilisateur peut interrompre le coach,
* la transcription partielle reste visible pendant l’écoute,
* le sous-titrage coach reste affiché pendant le TTS,
* en cas de doute de compréhension, le coach reformule ou demande confirmation,
* le dock doit pouvoir passer du vocal au texte sans reset de session.

### 8.6 Mobile

Sur mobile, le dock peut s’ouvrir en mode plein écran conversationnel tout en gardant le dashboard visible en arrière-plan flouté. Un swipe ou un bouton permet de revenir à la version compacte.

---

## 9. Débrief conversationnel vocal

### 9.1 Philosophie

Le débrief n’est pas présenté comme une collecte de données. C’est une conversation entre un coach et un conseiller. La donnée est un sous-produit maîtrisé de cette conversation.

### 9.2 KPI à collecter

| #  | KPI                        | Champ technique         | Type    | Définition                                       |
| -- | -------------------------- | ----------------------- | ------- | ------------------------------------------------ |
| 1  | Contacts                   | contacts_totaux         | int     | tous les contacts de la semaine                  |
| 2  | Estimations                | estimations_realisees   | int     | estimations physiques réalisées                  |
| 3  | Mandats                    | mandats_signes          | int     | total des mandats signés                         |
| 4  | Dont exclu                 | mandats_exclusifs       | int     | sous-ensemble exclusif                           |
| 5  | Acheteurs chauds           | acheteurs_chauds        | int     | acheteurs qualifiés et finançables               |
| 6  | Acheteurs sortis en visite | acheteurs_sortis_visite | int     | acheteurs distincts emmenés en visite            |
| 7  | Visites                    | nombre_visites          | int     | total des visites réalisées                      |
| 8  | Offres                     | offres_recues           | int     | offres écrites et formalisées                    |
| 9  | Compromis                  | compromis_signes        | int     | compromis signés                                 |
| 10 | Actes                      | actes_signes            | int     | actes authentiques signés                        |
| 11 | Chiffre d’affaires         | chiffre_affaires        | int     | honoraires encaissés ou sécurisés sur la semaine |
| 12 | Taux honos moyen           | taux_honoraires_moyen   | calculé | chiffre_affaires / actes_signes                  |

### 9.3 Ratios calculés automatiquement

| ID | Ratio                      | Calcul                    | Sens              |
| -- | -------------------------- | ------------------------- | ----------------- |
| R1 | Contacts → Estimations     | contacts / estimations    | moins = mieux     |
| R2 | Estimations → Mandats      | estimations / mandats     | moins = mieux     |
| R3 | Taux exclusivité           | exclu / mandats x 100     | plus = mieux      |
| R4 | Acheteurs → Sorties visite | acheteurs / sortis_visite | moins = mieux     |
| R5 | Visites par acheteur       | visites / sortis_visite   | zone idéale 2 à 4 |
| R6 | Visites → Offres           | visites / offres          | moins = mieux     |
| R7 | Offres → Compromis         | offres / compromis        | moins = mieux     |
| R8 | Compromis → Actes          | compromis / actes         | moins = mieux     |

### 9.4 Principes d’extraction

Le système sépare strictement:

* la parole utilisateur,
* la transcription,
* l’extraction structurée,
* la réponse coach,
* la sauvegarde finale.

Le LLM ne conserve pas seul l’état du débrief. Le backend maintient un draft structuré de session.

### 9.5 Draft structuré de session

Le draft contient pour chaque KPI:

* value,
* confidence,
* source,
* status,
* last_updated_at.

Statuts autorisés:

* missing,
* inferred,
* needs_confirmation,
* confirmed.

### 9.6 Exemple de draft conceptuel

```json
{
  "contacts_totaux": {"value": 30, "confidence": 0.62, "status": "needs_confirmation"},
  "estimations_realisees": {"value": 3, "confidence": 0.94, "status": "confirmed"},
  "mandats_signes": {"value": 2, "confidence": 0.97, "status": "confirmed"},
  "mandats_exclusifs": {"value": 1, "confidence": 0.97, "status": "confirmed"}
}
```

### 9.7 Règles de relance

Priorité de relance:

1. mandats_signes / mandats_exclusifs,
2. contacts_totaux / estimations_realisees,
3. nombre_visites / offres_recues,
4. actes_signes / chiffre_affaires.

Règles:

* maximum deux notions relancées dans le même tour,
* jamais de vocabulaire formulaire,
* après trois relances improductives, les KPI restants sont proposés comme nuls au moment de la confirmation finale, jamais injectés silencieusement.

### 9.8 Exemples de relances naturelles

* Et côté prospection cette semaine, tu as réussi à en faire un peu ?
* Tes acheteurs, tu en as sorti combien en visite ?
* Est-ce qu’il y a eu une signature cette semaine ?
* Sur les mandats, c’était du simple ou de l’exclu ?

### 9.9 Confirmation finale

Quand le système estime que le draft est suffisamment complet, le coach reformule en une seule phrase fluide.

Exemple:

“Je reprends: 45 contacts, 3 estimations, 2 mandats dont 1 exclu, 3 acheteurs chauds, 3 visites, 0 offre, 0 compromis, 0 acte, 0 euro. C’est bien ça ?”

Règles:

* jamais de tableau,
* jamais de jargon technique,
* si correction, seul le point corrigé est confirmé à nouveau,
* si validation, le backend lance la sauvegarde.

---

## 10. Lecture rapide de la semaine

### 10.1 Principe

Après validation et sauvegarde, le coach produit systématiquement une lecture rapide de la semaine. Une seule observation. Jamais une liste.

### 10.2 Sources utilisées

La lecture s’appuie sur:

* les ratios de la semaine,
* l’évolution par rapport aux 3 semaines précédentes,
* le benchmark du profil utilisateur,
* l’axe DPI le plus faible.

### 10.3 Règle de sélection

L’orchestrateur serveur calcule le signal prioritaire. Le LLM ne choisit pas librement parmi plusieurs diagnostics possibles.

### 10.4 Exemples

| Situation                                       | Lecture                                                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Visites sans offres                             | 3 visites pour 0 offre. Le sujet n’est pas le volume, c’est ce qui se passe pendant la visite. |
| Prospection correcte mais portefeuille stagnant | Tu génères du mouvement, mais ton portefeuille ne se solidifie pas depuis plusieurs semaines.  |
| Exclu signé et CA en hausse                     | Un exclu signé, c’est solide. Et cette semaine, ton activité commence à se transformer.        |
| Semaine creuse                                  | Semaine légère. Ce n’est pas grave si c’est ponctuel. Le vrai sujet, c’est la tendance.        |
| Bonne semaine globale                           | Semaine complète. Tu es dans le bon rythme sur plusieurs étages du pipe.                       |

---

## 11. Prescription

### 11.1 Règle de déclenchement

Une prescription n’est émise que si:

1. un axe faible clair est identifié,
2. une brique précise répond à cet axe,
3. cette brique n’est pas déjà active.

### 11.2 Règle de gouvernance

Le moteur de prescription est codé côté serveur. Le LLM ne fait que formuler le message final.

### 11.3 Périmètre V1

En V1, les prescriptions actives sont limitées pour réduire le risque:

* NXT Training — Prospection,
* NXT Training — Mandats / Exclusivité,
* NXT Training — Acheteurs,
* NXT Profiling dans un second niveau si le signal est très net.

NXT Finance reste hors cœur V1.

### 11.4 Matrice de prescription V1

| Axe faible                         | Signal observé                          | Brique               | Message de fond                                  |
| ---------------------------------- | --------------------------------------- | -------------------- | ------------------------------------------------ |
| Contacts → Estimations dégradé     | volume correct mais peu de RDV          | Training Prospection | tu génères, mais tu transformes peu              |
| Taux exclusivité faible            | part exclu basse sur plusieurs semaines | Training Mandats     | ton portefeuille reste trop fragile              |
| Visites → Offres faible            | visites nombreuses, offres absentes     | Training Acheteurs   | la qualification ou la conduite de visite coince |
| DPI génération opportunités faible | faiblesse structurelle confirmée        | Profiling            | ton sujet est moins ponctuel que structurel      |

### 11.5 Projection de gain CA

En V1, la projection CA est calculée uniquement sur les ratios où le modèle de gain est suffisamment compréhensible:

* taux exclusivité,
* visites → offres.

La projection est calculée côté serveur. Le coach l’intègre naturellement dans sa formulation.

### 11.6 Format de prescription

Structure:

1. lien avec l’observation,
2. valeur concrète de la brique,
3. éventuelle projection CA,
4. question ouverte.

Exemple:

“Ton taux d’exclu est bas depuis plusieurs semaines. Si tu te rapproches du niveau visé sur ton profil, ça peut représenter un vrai gain de CA d’ici la fin d’année. Il y a un module Training très concret sur l’argumentaire exclusivité. Tu veux que je t’y envoie ?”

### 11.7 Règles strictes

* une seule prescription par débrief,
* jamais deux briques dans le même message,
* pas de push agressif,
* si refus, le coach clôt proprement,
* les prescriptions refusées sont loguées.

---

## 12. System prompts et gouvernance LLM

### 12.1 Principe général

Le système n’utilise pas un seul prompt monolithique pour tout faire. Il sépare les responsabilités.

### 12.2 Trois usages LLM distincts

#### A. Extraction prompt

Objectif: transformer une transcription utilisateur en patch structuré.

Sortie attendue:

* patch des KPI détectés,
* ambiguïtés,
* confiance globale,
* besoin éventuel de clarification.

#### B. Conversation prompt

Objectif: produire la réponse coach la plus utile au tour suivant.

Entrées:

* persona,
* contexte utilisateur,
* trigger initial,
* draft structuré courant,
* dernier message utilisateur,
* étape de session.

Contraintes:

* phrases courtes,
* une question max,
* pas de vocabulaire formulaire,
* pas plus de 3 lignes,
* adapté à la persona.

#### C. Wording de prescription

Objectif: formuler une prescription déjà décidée par le moteur métier.

### 12.3 Ce que le LLM ne décide pas seul

* s’il faut sauvegarder ou non,
* si le draft est suffisamment complet,
* si une prescription est éligible,
* quel ratio est prioritaire,
* quelle brique est autorisée.

---

## 13. Architecture technique refactorisée

### 13.1 Vue d’ensemble

Le système est organisé en 5 couches.

#### 1. Voice Input Layer

Capture audio, détection début/fin de parole, transcription partielle et finale.

#### 2. Extraction Layer

Transforme la transcription finale en patch structuré sur les KPI.

#### 3. Conversation Layer

Produit le message coach en s’appuyant sur la persona, le contexte et le draft courant.

#### 4. Decision Layer

Décide côté serveur:

* relance,
* confirmation,
* sauvegarde,
* lecture,
* prescription.

#### 5. Voice Output Layer

Synthèse vocale persona, sous-titrage, interruption et fallback.

### 13.2 Principe d’orchestration

Le serveur orchestre. Le modèle rédige. Le moteur métier décide.

### 13.3 Technologies cibles

| Composant     | Technologie                | Rôle                                                   |
| ------------- | -------------------------- | ------------------------------------------------------ |
| UI coach      | React + Zustand            | gestion du dock, de la session et des états            |
| Audio capture | MediaRecorder / navigateur | capture micro                                          |
| STT           | provider à confirmer       | transcription audio                                    |
| TTS           | ElevenLabs                 | voix par persona                                       |
| Orchestrateur | API routes Next.js         | pipeline session                                       |
| Stockage      | Supabase                   | session, messages, drafts, prescriptions               |
| Ratios        | service métier TypeScript  | calcul KPI et signaux                                  |
| LLM           | OpenRouter                 | extraction, wording conversation, wording prescription |

### 13.4 Principe de tour de conversation

Un tour se déroule ainsi:

1. l’utilisateur parle,
2. la transcription finale est produite,
3. l’extraction met à jour le draft,
4. l’orchestrateur décide l’étape suivante,
5. le coach répond,
6. la réponse est affichée et vocalisée.

### 13.5 Reprise de session

Une session interrompue peut être reprise si le draft n’a pas été abandonné. Le coach reprend à l’étape courante avec le dernier état connu.

---

## 14. Base de données

### 14.1 Tables principales

#### coach_sessions

```sql
CREATE TABLE coach_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  org_id UUID NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_context JSONB,
  persona_used TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  saved_period_result_id UUID,
  relance_count INT NOT NULL DEFAULT 0,
  current_step TEXT NOT NULL DEFAULT 'prompted',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### coach_messages

```sql
CREATE TABLE coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES coach_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  channel TEXT NOT NULL,
  transcript_text TEXT,
  coach_text TEXT,
  audio_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### coach_draft_states

```sql
CREATE TABLE coach_draft_states (
  session_id UUID PRIMARY KEY REFERENCES coach_sessions(id) ON DELETE CASCADE,
  extracted_kpis JSONB NOT NULL DEFAULT '{}',
  confidence_map JSONB NOT NULL DEFAULT '{}',
  unresolved_fields TEXT[] NOT NULL DEFAULT '{}',
  last_user_transcript TEXT,
  current_step TEXT NOT NULL DEFAULT 'collecting',
  relance_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### coach_prescriptions

```sql
CREATE TABLE coach_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  session_id UUID REFERENCES coach_sessions(id),
  brique TEXT NOT NULL,
  module TEXT,
  ratio_id TEXT,
  trigger_axis TEXT,
  current_value NUMERIC,
  target_value NUMERIC,
  projected_ca_gain NUMERIC,
  user_response TEXT,
  prescribed_at TIMESTAMPTZ DEFAULT now()
);
```

### 14.2 Modification profils

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coach_persona TEXT DEFAULT 'sacha';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coach_persona_set_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coach_onboarded BOOLEAN DEFAULT false;
```

### 14.3 RLS

Principes:

* utilisateur: lecture et écriture sur ses propres sessions,
* manager / directeur: visibilité sur le statut de complétion et les prescriptions, pas sur le contenu complet des messages en V1,
* prescriptions et sessions protégées par auth.uid().

---

## 15. API

### 15.1 Routes V1

| Route                           | Méthode | Rôle                                                      |
| ------------------------------- | ------- | --------------------------------------------------------- |
| /api/coach/session/start        | POST    | crée une session et renvoie le premier message coach      |
| /api/coach/transcribe           | POST    | reçoit audio et renvoie transcription partielle ou finale |
| /api/coach/turn                 | POST    | traite un tour utilisateur complet                        |
| /api/coach/confirm              | POST    | valide le récapitulatif et sauvegarde                     |
| /api/coach/prescription/respond | POST    | loggue la réponse à la prescription                       |
| /api/vocal                      | POST    | synthèse vocale persona                                   |
| /api/coach/context              | GET     | assemble le contexte utilisateur                          |

### 15.2 Contrat session/start

Entrée:

```json
{
  "trigger": {
    "type": "bubble_ratio",
    "ratio_id": "visites_offres",
    "ratio_value": 6
  }
}
```

Sortie:

```json
{
  "session_id": "uuid",
  "ui_state": "speaking",
  "coach_text": "3 visites pour 0 offre. On regarde ça ensemble ?",
  "tts_text": "3 visites pour 0 offre. On regarde ça ensemble ?",
  "persona": "sacha"
}
```

### 15.3 Contrat turn

Entrée:

```json
{
  "session_id": "uuid",
  "transcript_final": "J'ai fait deux mandats dont un exclu, trois visites et aucune offre.",
  "channel": "voice"
}
```

Sortie:

```json
{
  "session_id": "uuid",
  "ui_state": "collecting",
  "coach_text": "Sur la prospection, tu as eu combien de contacts cette semaine ?",
  "tts_text": "Sur la prospection, tu as eu combien de contacts cette semaine ?",
  "draft_status": {
    "confirmed_fields": 4,
    "uncertain_fields": [],
    "missing_priority": ["contacts_totaux", "estimations_realisees"],
    "can_confirm": false
  }
}
```

### 15.4 Contrat confirm

Entrée:

```json
{
  "session_id": "uuid",
  "confirmed": true
}
```

Sortie:

```json
{
  "session_id": "uuid",
  "ui_state": "reading",
  "saved": true,
  "coach_text": "3 visites pour 0 offre. Le sujet, ce n'est pas le volume. C'est ce qui se passe pendant la visite.",
  "prescription": {
    "eligible": true,
    "brique": "nxt_training",
    "module": "acheteurs",
    "projected_ca_gain": 8000,
    "label": "NXT Training — Acheteurs"
  }
}
```

---

## 16. Moteur de décision métier

### 16.1 Rôle

Décider, à partir du draft et du contexte:

* quels KPI restent à clarifier,
* si la confirmation peut être proposée,
* quelle lecture prioritaire doit sortir,
* si une prescription est autorisée,
* si une projection CA peut être affichée.

### 16.2 Inputs

* draft structuré,
* 4 dernières semaines,
* profil utilisateur,
* benchmarks,
* axe DPI faible,
* abonnements actifs,
* historique de prescriptions.

### 16.3 Outputs

* next_step,
* clarification_targets,
* reading_signal,
* prescription_decision,
* projection_value éventuelle.

### 16.4 Règles de sécurité métier

* pas de prescription si moins de 4 semaines d’historique exploitable sauf cas très net,
* pas de prescription si la brique est déjà active,
* pas de prescription si la confiance du draft est insuffisante,
* pas de lecture trop sévère si les volumes sont trop faibles pour être interprétés sérieusement.

---

## 17. Exigences non fonctionnelles

### 17.1 Performance

| Métrique                                  |    Cible | Limite acceptable |
| ----------------------------------------- | -------: | ----------------: |
| Fin de parole → transcription finale      | < 700 ms |        < 1 200 ms |
| Fin de parole → début réponse coach audio |  < 1,8 s |           < 2,8 s |
| Réponse coach audio                       |    < 8 s |            < 12 s |
| Sauvegarde après validation               | < 500 ms |             < 1 s |
| Assemblage contexte                       | < 300 ms |          < 600 ms |

### 17.2 Fiabilité

* si la confiance STT est faible, le coach préfère confirmer que supposer,
* si le TTS échoue, la session continue en texte,
* si le micro est indisponible, le dock passe en fallback texte sans perte de session,
* timeout LLM à 15 secondes maximum,
* aucune donnée n’est perdue si la page se recharge pendant une session active récente.

### 17.3 Sécurité

* JWT Supabase obligatoire sur toutes les routes,
* prompts jamais exposés côté client,
* validation serveur des types et des bornes avant écriture,
* RLS actif sur toutes les tables,
* aucune donnée sensible non nécessaire dans les prompts.

### 17.4 Accessibilité

* sous-titres affichés par défaut,
* navigation clavier sur les actions critiques,
* contraste AA minimum,
* indicateur visuel explicite pour l’écoute et la parole,
* alternative texte disponible en permanence.

### 17.5 Compatibilité

* desktop Chrome: expérience premium cible,
* Android Chrome: vocal supporté avec fallback,
* iOS Safari: expérience dégradée acceptable avec fallback texte si nécessaire.

---

## 18. Hors scope V1

| Feature exclue                                    | Raison                            | Horizon        |
| ------------------------------------------------- | --------------------------------- | -------------- |
| mémoire conversationnelle profonde entre sessions | complexité élevée                 | V2             |
| analytics manager détaillées sur le contenu       | sujet privacy                     | V2             |
| conversation vocale temps réel duplex             | trop complexe pour V1             | V2             |
| coach multilingue                                 | marché FR prioritaire             | V3             |
| prescription multi-briques                        | surcharge cognitive               | V2             |
| intégration CRM automatique                       | hors périmètre du trimestre       | post-lancement |
| coaching libre hors débrief                       | risque de dilution de la promesse | V2             |

---

## 19. KPIs de succès

### 19.1 Adoption

| KPI                                                | Cible 30 jours | Cible 90 jours |
| -------------------------------------------------- | -------------: | -------------: |
| utilisateurs ayant choisi une persona              |          > 80% |          > 95% |
| utilisateurs ayant réalisé au moins 1 débrief      |          > 50% |          > 70% |
| débriefs réalisés à la voix                        |          > 60% |          > 75% |
| fréquence moyenne des débriefs / utilisateur actif |     > 2 / mois |     > 3 / mois |

### 19.2 Qualité

| KPI                                |              Cible |
| ---------------------------------- | -----------------: |
| durée moyenne d’un débrief         |            < 5 min |
| nombre moyen de relances           |                < 3 |
| taux de correction utilisateur     |              < 15% |
| taux d’abandon en cours de session |              < 20% |
| taux de fallback texte forcé       | < 25% au lancement |
| satisfaction post-débrief          |             > 7/10 |

### 19.3 Business

| KPI                                           | Cible 90 jours |
| --------------------------------------------- | -------------: |
| taux d’acceptation des prescriptions          |          > 25% |
| conversion prescription → ouverture de brique |          > 15% |
| conversion prescription → abonnement          |          > 10% |
| churn des utilisateurs avec > 3 débriefs      |           < 3% |

---

## 20. Phasage d’implémentation

### Phase 1 — Fondations produit et data

Durée estimée: 1 semaine

Livrables:

* migration tables coach,
* stockage persona dans profiles,
* endpoint de contexte,
* bouton manuel “Débriefer ma semaine”,
* state machine documentée.

### Phase 2 — Dock + parcours texte stable

Durée estimée: 1 semaine

Livrables:

* coach bubble,
* voice dock UI,
* machine d’états,
* session start / turn / confirm en mode texte,
* sauvegarde en base fiable.

### Phase 3 — Voice input

Durée estimée: 1 semaine

Livrables:

* capture micro,
* transcription partielle et finale,
* détection fin de parole,
* gestion erreurs micro,
* fallback texte fluide.

### Phase 4 — Voice output

Durée estimée: 1 semaine

Livrables:

* TTS persona,
* sous-titres coach,
* interruption coach,
* reprise de tour après coupure.

### Phase 5 — Lecture métier + prescription

Durée estimée: 3 à 4 jours

Livrables:

* moteur lecture prioritaire,
* moteur éligibilité prescription,
* carte prescription,
* projection CA sur 2 ratios V1.

### Phase 6 — QA et recette

Durée estimée: 1 semaine

Livrables:

* scénarios de test bout en bout,
* tests mobile,
* tests bruit / interruption / correction,
* tuning prompts et règles.

### Estimation totale

6 à 7 semaines pour une V1 voice-first sérieuse, testée et industrialisable.

---

## 21. Décisions produit à figer avant build

1. Le coach est voice-first mais jamais voice-only.
2. Le débrief est lançable par bulle et par bouton manuel.
3. MondayGate coexiste avec NXT Coach pendant la phase de transition.
4. Le manager ne voit pas le contenu détaillé des échanges en V1.
5. Les prescriptions refusées sont loguées.
6. La projection CA V1 est limitée à deux ratios.
7. Le moteur métier décide, le LLM formule.
8. Les KPI sont stockés dans un draft serveur et non dans la seule mémoire du modèle.

---

## 22. Questions ouvertes

| ID | Question                                                                  | Impact                     | Décision attendue   |
| -- | ------------------------------------------------------------------------- | -------------------------- | ------------------- |
| Q1 | Quel provider STT est retenu pour la V1?                                  | expérience vocale centrale | produit + tech      |
| Q2 | Quelle voix ElevenLabs par persona?                                       | identité vocale            | produit             |
| Q3 | MondayGate est-il progressivement remplacé ou maintenu durablement?       | conduite du changement     | produit             |
| Q4 | Quel niveau exact de visibilité manager est autorisé?                     | privacy / pilotage         | produit + juridique |
| Q5 | Le débrief peut-il être déclenché depuis la sidebar en plus du dashboard? | accessibilité usage        | produit             |
| Q6 | Quelle stratégie de reprise après session interrompue?                    | UX / fiabilité             | tech                |
| Q7 | Quels benchmarks par profil sont utilisés pour les lectures?              | qualité du coaching        | produit métier      |

---

## 23. Résumé exécutif pour l’équipe

NXT Coach V1 n’est pas un simple assistant vocal. C’est un débrief vocal piloté par règles, rendu humain par la conversation.

La réussite du produit dépend de 4 conditions:

* une expérience vocale rapide et agréable,
* une extraction suffisamment fiable pour inspirer confiance,
* une confirmation systématique avant sauvegarde,
* une lecture et une prescription réellement utiles.

Le cœur du système n’est donc pas le TTS ni le prompt. Le cœur du système est l’orchestrateur métier qui transforme un échange vocal court en pilotage clair.
