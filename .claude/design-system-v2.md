# Design System v2 — Patterns extraits de `/pourquoi-nxt`

Référence d'analyse : `src/app/pourquoi-nxt/page.tsx` (commit `3814861`).

Ce document est la **source de vérité visuelle** pour les refontes UI à venir du produit NXT Performance. Les règles en fin de document (§6) sont la checklist pour valider qu'une page atteint le "bon niveau de soin".

Aucun nouveau token Tailwind n'est introduit. Tout le vocabulaire ci-dessous utilise les tokens déjà présents dans le projet (`text-foreground`, `text-muted-foreground`, `text-primary`, `bg-card`, `bg-muted/*`, `bg-primary/*`, `border-border`, `border-primary/30`, etc.).

---

## 1. Structure de page

### Ordre narratif (de haut en bas)

| # | Section | Rôle narratif | Max-width | Padding vertical |
|---|---|---|---|---|
| 0 | Header | Navigation + CTA permanent | `max-w-6xl` | `py-4` |
| 1 | Hero | Accroche + promesse + CTA principal | `max-w-4xl` | `py-16` |
| 2 | Problème cadré | "Ce que font les autres outils, ce que ça vous coûte" | `max-w-3xl` | `py-12` |
| 3 | Mécanique produit | Comment ça marche en N étapes | `max-w-5xl` | `py-12` |
| 4 | Tableau comparatif | Différenciation terme-à-terme | `max-w-5xl` | `py-12` |
| 5 | Catalogue | Briques / modules en grille | `max-w-6xl` | `py-12` |
| 6 | Preuve / Légitimité | "Conçu par ...", 3 piliers | `max-w-5xl` | `py-12` |
| 7 | Témoignages | Social proof 3 cards | `max-w-5xl` | `py-12` |
| 8 | CTA final | Encart primary/5 + bouton + subline | `max-w-3xl` | `py-16` |
| 9 | Footer | Signature + mention légère | `max-w-6xl` | `py-8` |

### Règles de max-width

- `max-w-3xl` — sections **denses en texte**, monologue, encart CTA final. Force la lecture centrée.
- `max-w-4xl` — hero seulement (confort lecture + poids de l'accroche).
- `max-w-5xl` — sections avec **grille 3 colonnes ou tableau** (lecture comparée).
- `max-w-6xl` — header / footer / grilles à 5-6 cartes (catalogue).

### Rythme vertical

- Section standard : `py-12`.
- Section charnière (hero, CTA final) : `py-16`.
- Header : `py-4` ; Footer : `py-8`.
- Aucune section n'utilise `py-20`/`py-24`/`py-32`. Le rythme est **volontairement serré** pour garder la page lisible sans scroll excessif.
- Les séparateurs entre sections sont **implicites** (changement de max-width + gap de padding). Pas de `<hr>`, pas de trait.

### Padding horizontal

- Partout : `px-4` sur le wrapper de section. Pas de `px-6` ou `px-8`, c'est Tailwind + `max-w-*` qui fait le travail.

---

## 2. Hiérarchie typographique

### H1 — une seule par page (hero)

```
text-4xl md:text-5xl font-bold tracking-tight leading-tight text-foreground
```
- `tracking-tight` pour resserrer les lettres (cf. règle 4).
- Le H1 peut être long (jusqu'à 10-15 mots) ; 1 à 3 mots-clés centraux mis en `text-primary` via `<span>` inline (cf. règle 12 pour la dose).
- Spacing : H1 en `mt-4` par rapport à l'éyebrow ; paragraphe sous-titre en `mt-6` par rapport au H1 (cf. règle 15).

### H2 — titre de section

Deux variantes selon le contexte :

**H2 standard (section ouverte)**
```
text-3xl font-bold text-foreground
```
- `mb-3` sous le H2 avant le paragraphe d'intro.
- Généralement `text-center` quand la section a une intro centrée, `text-left` sinon.

**H2 dans un encart/card (section boxée)**
```
text-2xl font-bold text-foreground
```
- Utilisé quand le H2 est à l'intérieur d'une card (ex. section "Afficher n'est pas décider", CTA final).
- `mb-4` pour séparer du paragraphe.

### H3 — sous-titre / titre de card

Trois variantes selon le poids visuel voulu :

**H3 "card principale" (flywheel, trajectoire)**
```
text-lg font-bold text-foreground
```

**H3 "card compacte" (prescription step)**
```
text-base font-bold text-foreground
```

**H3 "pilier / chip éditorial" (coach pillars)**
```
text-sm font-bold uppercase tracking-wider text-primary
```
(Se comporte comme un éyebrow, pas comme un titre de bloc — à utiliser quand la card n'a pas de H3 "classique".)

### Éyebrow — label avant titre ou dans card

**Éyebrow hero (au-dessus du H1, cf. règle 15)**
```
text-xs uppercase tracking-wider text-muted-foreground
```
- Plain text, pas de pastille. Icône décorative possible (`h-3.5 w-3.5`) si elle sert la hiérarchie.
- Spacing avec le H1 géré par la structure hero (règle 15) : H1 en `mt-4` par rapport à l'éyebrow.

**Éyebrow pastille (au-dessus d'un H2 de section)**
```
inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary
```
- Avec icône optionnelle (Lucide `h-3.5 w-3.5`).
- Variante "section majeure" : ajouter `uppercase tracking-wider`.
- `mb-3` ou `mb-4` sous l'éyebrow.
- Réservé aux **H2 de section**, pas aux H1. Les héros utilisent la variante plain ci-dessus.

**Éyebrow texte nu (dans card, au-dessus d'un H3)**
```
text-xs font-semibold uppercase tracking-wider text-primary
```
- Sans pastille. Utilisé pour le `subtitle` des FlywheelStep.

**Éyebrow "verbe fort" (prescription)**
```
text-xs font-bold uppercase tracking-[0.14em] text-primary
```
- Variante plus grasse et plus espacée pour les verbes d'action ("LIT", "DÉTECTE", "PRESCRIT").

### Paragraphes

| Contexte | Classes |
|---|---|
| Paragraphe hero | `text-lg md:text-xl text-muted-foreground max-w-2xl` (cf. règle 15 pour l'espacement `mt-6`) |
| Intro sous H2 (centrée) | `text-muted-foreground` + `mx-auto max-w-2xl` ou `max-w-3xl` |
| Corps dans card principale | `text-base leading-relaxed text-muted-foreground` |
| Corps dans card compacte | `text-sm leading-relaxed text-muted-foreground` |
| Corps dans encart emphasis (bg-primary/5) | `text-sm leading-relaxed text-foreground md:text-base` |
| Corps dans encart muted (bg-muted/30) | `text-sm leading-relaxed text-muted-foreground md:text-base` |
| Subline sous CTA | `text-xs text-muted-foreground` + `mt-3` |

### Emphasis inline dans un paragraphe

- Terme-clé produit : `<span className="text-primary">...</span>`
- Nom / concept à ancrer : `<span className="font-semibold text-foreground">...</span>`
- Accent léger : `<span className="font-medium">...</span>`
- **Règle** : maximum 2-3 emphases par paragraphe, sinon elles se neutralisent.

---

## 3. Composants et patterns visuels

### Cards

**Card standard (catalogue, témoignage, step)**
```
rounded-xl border border-border bg-card p-6
```
- Padding modulable : `p-5` (card compacte à 5 colonnes), `p-8` (card à contenu textuel long), `p-6` (défaut).

**Card à numéro (flywheel)**
```
relative rounded-xl border border-border bg-card p-6
```
Avec badge numéro positionné en absolu :
```
absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center
rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-md
```

**Card dans card (pilier à l'intérieur d'un encart boxé)**
```
rounded-lg border border-border bg-background p-5
```
- `rounded-lg` (pas `xl`) + `bg-background` (pour contraster avec le `bg-card` parent).

### Encarts d'emphasis

**Encart "conclusion / CTA final" (primary/5)**
```
rounded-xl border border-primary/30 bg-primary/5 p-6
```
- Utilisé pour : conclusion d'une section mécanique, CTA final, points-clés à retenir.
- Padding étendu pour CTA final : `p-10`.

**Encart "trajectoire / aside" (muted/30)**
```
rounded-xl border border-border bg-muted/30 p-6 md:p-8
```
- Utilisé pour : bloc parenthèse, roadmap, "la suite arrive", contexte secondaire.
- **Jamais** de cards imbriquées dedans — uniquement un H3 + paragraphe.

**Encart "section boxée" (card plein)**
```
rounded-xl border border-border bg-card p-8 md:p-10
```
- Quand toute une section est une grosse card (section "Afficher n'est pas décider", section "Conçu par des coachs").
- Peut contenir une grille de sous-cards (`bg-background` à l'intérieur).

### Icône wrapper

| Taille | Wrapper | Icône |
|---|---|---|
| S (dans header card, accent sémantique) | `h-10 w-10 rounded-lg bg-red-500/10` (ou autre tint sémantique) | `h-5 w-5 text-red-500` |
| M (card compacte, prescription) | `h-11 w-11 rounded-lg bg-primary/10` | `h-5 w-5 text-primary` |
| L (card principale, flywheel) | `h-12 w-12 rounded-lg bg-primary/10` | `h-6 w-6 text-primary` |

- Wrapper centré : `flex items-center justify-center`.
- Toujours `rounded-lg` (pas `rounded-xl`, pas `rounded-full`, sauf badge numéro).
- `mb-4` sous l'icône avant le titre de card.

### Tables (comparatif)

**Wrapper**
```
overflow-x-auto rounded-xl border border-border bg-card
```

**Table**
```
<table className="w-full min-w-[640px]">
```
- `min-w-[640px]` force un scroll horizontal mobile plutôt que d'écraser les colonnes.

**Thead**
```
<tr className="bg-muted/50">
  <th className="px-4 py-4 text-left text-sm font-semibold text-foreground"></th>
```
- Colonne "négative" (ce qu'on ne fait pas) : `text-muted-foreground` + icône X rouge.
- Colonne "positive" (nous) : `text-primary` + icône Check emerald.

**Rows**
- Ligne standard : `border-t border-border`.
- Ligne emphasée (point-clé du tableau) : `border-t border-border bg-primary/5`.
- **Règle** : 2 rows max en `bg-primary/5` par tableau, choisies pour les critères qui font la différence produit.

**Cellules**
- `px-4 py-4 text-sm`.
- Colonne critère (gauche) : `font-semibold text-foreground`.
- Colonne négative (milieu) : `text-muted-foreground`.
- Colonne positive standard (droite) : `font-medium text-foreground`.
- Colonne positive emphasée : `font-semibold text-foreground`.

### CTAs / Boutons

**CTA principal (hero, CTA final)**
```
inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3
text-base font-semibold text-primary-foreground shadow-lg
transition-colors hover:bg-primary/90
```
Avec icône Lucide `h-5 w-5` (typiquement `ArrowRight`).

**CTA nav (header)**
```
inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2
text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90
```
- Plus compact, **sans shadow**. Icône `h-4 w-4`.

**Subline sous CTA**
```
mt-3 text-xs text-muted-foreground
```
- Toujours présente sous le CTA principal (hero, CTA final). Raison légale / essai gratuit / carte bancaire.

### Badges / Pills

**Pill primary (éyebrow avec icône)**
```
inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1
text-xs font-semibold text-primary
```
- Variante uppercase : ajouter `uppercase tracking-wider`.

### Testimonial

```
rounded-xl border border-border bg-card p-6
```
- Guillemet décoratif : `text-3xl text-primary/30` (`&ldquo;`).
- Citation : `text-sm italic leading-relaxed text-foreground`.
- Auteur : `text-xs font-medium text-muted-foreground` avec préfixe `— `.

### Header / Footer

**Header**
```
border-b border-border bg-card/50 backdrop-blur
```
Contenu : `mx-auto flex max-w-6xl items-center justify-between px-4 py-4`.
Logo : `text-lg font-bold text-foreground`.

**Footer**
```
border-t border-border bg-card/30 py-8
```
Contenu : `mx-auto max-w-6xl px-4 text-center text-xs text-muted-foreground`.

---

## 4. Tokens Tailwind utilisés (vocabulaire complet)

### Texte

| Token | Usage |
|---|---|
| `text-foreground` | Titres (H1/H2/H3), logo, emphasis inline, texte principal dans card emphasée |
| `text-muted-foreground` | Paragraphes corps, descriptions card, sublines, captions, auteurs témoignage |
| `text-primary` | Éyebrows, piliers, verbes d'action, mots-clés inline, headers colonne "nous", titre pilier |
| `text-primary-foreground` | Texte sur CTA primary, badge numéro |
| `text-red-500` | Icône "ce qui ne va pas" (X, douleur) — **sémantique seulement** |
| `text-emerald-500` | Icône "validé" (Check) — **sémantique seulement** |

### Fond

| Token | Usage |
|---|---|
| `bg-background` | Body de page, cards imbriquées dans une card parente |
| `bg-card` | Cards standards, header (avec opacity `/50`), footer (avec opacity `/30`) |
| `bg-muted/30` | Encart "trajectoire / aside / secondaire" |
| `bg-muted/50` | Thead de tableau |
| `bg-primary/5` | Encart "conclusion / CTA final / row emphasée tableau" |
| `bg-primary/10` | Wrapper d'icône, pastille éyebrow |
| `bg-primary` | CTA principal, badge numéro |
| `bg-red-500/10` | Wrapper d'icône sémantique négative |

### Bordure

| Token | Usage |
|---|---|
| `border-border` | Cards standards, header, footer, rows de tableau |
| `border-primary/30` | Encart d'emphasis `bg-primary/5` (CTA final, conclusion) |

### Effets

| Token | Usage |
|---|---|
| `shadow-lg` | CTA principal seulement |
| `shadow-md` | Badge numéro flywheel |
| `backdrop-blur` | Header |

### Rayons

| Token | Usage |
|---|---|
| `rounded-full` | Pills éyebrow, badge numéro |
| `rounded-xl` | Cards principales, encarts emphasis, tableau wrapper |
| `rounded-lg` | CTA, wrapper d'icône, cards imbriquées (card-in-card) |

---

## 5. Responsive

### Breakpoints utilisés

- Seulement `md:` (≥768px) et `lg:` (≥1024px). **Pas** de `sm:`, `xl:`, `2xl:`.
- Mobile-first strict : les classes par défaut sont les classes mobile.

### Grilles

| Pattern | Usage |
|---|---|
| `grid gap-4 md:grid-cols-2 lg:grid-cols-5` | 5 étapes très denses (prescription) |
| `grid gap-6 md:grid-cols-2 lg:grid-cols-3` | 6 cartes catalogue (flywheel) |
| `grid gap-4 md:grid-cols-3` | 3 piliers serrés (coach pillars) |
| `grid gap-6 md:grid-cols-3` | 3 cartes aérées (témoignages) |

- `gap-4` pour grilles denses (cards compactes), `gap-6` pour grilles aérées.
- Sur mobile : toutes les grilles stackent en 1 colonne (comportement par défaut).

### Typographie responsive

- H1 : `text-4xl md:text-5xl`.
- Paragraphe sous-titre hero : `text-lg md:text-xl` (cf. règle 15).
- Paragraphes dans encart : `text-sm md:text-base` — discret sur mobile, lisible desktop.
- H2/H3 : **fixes** (pas de variation responsive).

### Padding responsive

- Encart "section boxée" : `p-8 md:p-10`.
- Encart "trajectoire" : `p-6 md:p-8`.
- Le reste : **fixe**. La densité mobile est assumée.

### Tableaux

- Jamais de transformation mobile (pas de cards stackées). Scroll horizontal via `overflow-x-auto` + `min-w-[640px]`.

### Accessibilité / qualité

- Toutes les icônes Lucide sont décoratives (pas d'aria-label manquant observé — mais c'est aussi parce qu'elles accompagnent du texte).
- Contrastes : `text-muted-foreground` sur `bg-card` et `bg-background` respecte WCAG AA (les tokens du projet sont en OKLCH calibré).

---

## 6. Règles actionnables (checklist pour refonte)

Ces 16 règles sont la **checklist** pour valider qu'une page est alignée sur le design-system v2. Elles servent aussi de guide pour l'audit des autres pages.

### R1 — Rythme vertical serré
Utiliser `py-12` pour toute section standard, `py-16` uniquement pour hero et CTA final. **Ne jamais** utiliser `py-20`, `py-24`, `py-32`. La densité est volontaire.

### R2 — Max-width en fonction du contenu, pas du goût
- `max-w-3xl` pour sections denses en texte (monologue, encart).
- `max-w-4xl` pour le hero uniquement.
- `max-w-5xl` pour grilles 3 cols + tableaux.
- `max-w-6xl` pour header/footer et grilles 5-6 cols.

### R3 — Éyebrow avant H2 sur les sections mécaniques
Une section qui explique une mécanique produit (le "comment") commence par un éyebrow pill (`bg-primary/10`) + H2 + paragraphe d'intro centré `max-w-2xl` ou `max-w-3xl`. Les sections "preuve sociale" (témoignages) ou "catalogue" peuvent s'en passer.

### R4 — H1 unique
`text-4xl md:text-5xl`, `font-bold`, `tracking-tight`. Le H1 peut être long (jusqu'à une phrase complète de 10-15 mots). À l'intérieur, mets en emphase 1-3 mots clés via `<span className="text-primary">...</span>` pour guider l'œil sur le message central. Éviter les H1 génériques courts type "Bienvenue" ou "Découvrez X" — un H1 doit porter le message produit.

### R5 — H2 garde le même format partout
`text-3xl font-bold text-foreground`, centré quand la section a une intro centrée. Variante `text-2xl` uniquement si le H2 est **à l'intérieur d'une card** (section boxée).

### R6 — Tableaux comparatifs : 2 lignes emphasées max
Un tableau comparatif utilise `bg-primary/5` sur **2 lignes maximum**, celles qui cristallisent la différence produit. Au-delà l'emphase se perd.

### R7 — Encart `bg-muted/30` = aside, pas CTA
L'encart muted (trajectoire, roadmap, parenthèse) ne contient **jamais** de cards imbriquées, **jamais** de bouton. Seulement un H3 + paragraphe. C'est un aparté, pas un point d'action.

### R8 — Encart `bg-primary/5` = conclusion ou CTA
L'encart primary (border `primary/30`) cristallise soit une conclusion forte (fin d'une section mécanique), soit un CTA final (avec bouton + subline). Jamais de grille dedans.

### R9 — CTA principal avec subline et shadow-lg
Un CTA principal (hero + CTA final) a **toujours** `shadow-lg` + icône `ArrowRight h-5 w-5` + subline `text-xs text-muted-foreground` en dessous (`mt-3`). Le CTA header est plus compact et sans shadow.

### R10 — Icônes toujours dans un wrapper teinté
Aucune icône Lucide "nue" dans le flux principal. Toujours dans un wrapper `rounded-lg` coloré (`bg-primary/10` ou `bg-red-500/10`). Tailles standardisées : `h-10/11/12 w-10/11/12`. Icône à l'intérieur : `h-5 w-5` ou `h-6 w-6`.

### R11 — Card-in-card : `bg-background` + `rounded-lg`
Une card imbriquée (pilier à l'intérieur d'une section boxée) utilise `bg-background` (pas `bg-card`) et `rounded-lg` (pas `rounded-xl`) pour créer un contraste visible avec le parent `bg-card`.

### R12 — Emphasis inline : 2-3 spans max par paragraphe
Dans un paragraphe, pas plus de 2-3 `<span className="text-primary">` ou `<span className="font-semibold text-foreground">`. Au-delà, tout devient emphasé = rien n'est emphasé.

### R13 — Grilles avec gap calibré
- `gap-4` pour grilles denses (cards compactes `p-5`, 5 colonnes).
- `gap-6` pour grilles aérées (cards `p-6`, 2-3 colonnes).

### R14 — Responsive minimal : `md:` et `lg:` seulement
Ne jamais introduire `sm:`, `xl:`, `2xl:`. La grille et la typo se redimensionnent en 2 paliers max. Les tableaux scrollent horizontalement au lieu de se transformer.

### R15 — Template hero
Structure fixe pour tous les héros du produit :

1. **Éyebrow** — `text-xs uppercase tracking-wider text-muted-foreground` (plain text, pas de pastille sur les héros — réserver les pills `bg-primary/10` aux éyebrows de section).
2. **H1** (règle 4) — `mt-4` par rapport à l'éyebrow.
3. **Sous-titre paragraphe** — `text-lg md:text-xl text-muted-foreground max-w-2xl`, `mt-6` par rapport au H1.
4. **CTA principal + subline** (règle 9) — `mt-8` ou `mt-10` par rapport au sous-titre.

Le hero est centré (`text-center mx-auto`) sauf exception design validée. Padding `py-16` minimum sur la `<section>` parent.

### R16 — Une section, une idée
Chaque section majeure défend UN seul point. Si deux idées émergent dans une section, scinde en deux sections distinctes (chacune avec éyebrow + H2 + contenu).

Cette règle combat la tendance à empiler les infos. **Signal d'alerte** : si tu utilises "Aussi" ou "Par ailleurs" dans une section, c'est qu'elle contient 2 idées.

---

## Annexe — Anti-patterns à éviter

Identifiés par contraste avec `/pourquoi-nxt`. Si une page existante présente l'un de ces patterns, c'est un **signal** qu'elle doit être refondue.

- Sections sans éyebrow sur des pages marketing (la hiérarchie est plate).
- `py-20`+ qui étire la page sans densifier le message.
- Cards sans bordure (`border-border` absent) → aspect "brouillon".
- Icônes nues sans wrapper teinté.
- Tableaux qui transforment en cards stackées sur mobile (perte de lecture comparative).
- Paragraphes sans `leading-relaxed` dans les cards (texte qui "colle").
- CTA sans subline (perte de contexte essai gratuit / légal).
- Emphasis inline excessive (5+ `text-primary` par paragraphe).
- `rounded-2xl` ou `rounded-3xl` (incohérent avec le système — seul `rounded-xl` / `lg` / `full` sont utilisés).
- Shadow multiples (`shadow-lg`, `shadow-xl`, `shadow-2xl`) qui alourdissent visuellement.
