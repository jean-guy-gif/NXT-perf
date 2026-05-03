/**
 * Team activation kit (PR3.8.6 follow-up).
 *
 * Génère 3 supports prêts-à-utiliser pour le manager autour d'un levier
 * prioritaire :
 *   - Réunion équipe (préparer le brief de cadrage)
 *   - Mise en pratique (jeu de rôle, cas réel, exercice ciblé)
 *   - 4 points hebdo (trame de suivi sur 4 semaines)
 *
 * Source du contenu : `coach-brain` (RATIO_EXPERTISE diagnostic + first
 * action + top practices) + `team-actions` (voix manager). Aucune logique
 * métier nouvelle ne quitte ce module — c'est un assembleur de contenu.
 *
 * Format de sortie : structure `Kit` indépendante du rendu, sérialisable
 * en texte (markdown léger) pour copier-coller / téléchargement V1.
 */

import {
  getDiagnosis,
  getFirstAction,
  getTeamActions,
  getTopPractices,
} from "@/lib/coaching/coach-brain";
import { RATIO_EXPERTISE, type ExpertiseRatioId } from "@/data/ratio-expertise";

// ─── Types ────────────────────────────────────────────────────────────────

export interface KitSection {
  heading: string;
  /** Paragraphe libre (optionnel). */
  paragraph?: string;
  /** Liste à puces (optionnel). */
  bullets?: string[];
}

export interface Kit {
  /** Titre principal pour le drawer. */
  title: string;
  /** Sous-titre / contexte court. */
  subtitle?: string;
  sections: KitSection[];
}

export type KitKind = "meeting" | "practice" | "weekly";

// ─── Helpers internes ─────────────────────────────────────────────────────

function leverLabel(id: ExpertiseRatioId): string {
  return RATIO_EXPERTISE[id]?.label ?? id;
}

// ─── Builder 1 : Réunion équipe ───────────────────────────────────────────

export function buildTeamMeetingKit(expertiseId: ExpertiseRatioId): Kit {
  const label = leverLabel(expertiseId);
  const diagnosis = getDiagnosis(expertiseId);
  const teamActions = getTeamActions(expertiseId, 3);
  const firstAction = getFirstAction(expertiseId);

  return {
    title: `Réunion équipe — ${label}`,
    subtitle:
      "Trame de brief à présenter à votre équipe pour cadrer le levier prioritaire.",
    sections: [
      {
        heading: "Objectif de la réunion",
        paragraph: `Aligner l'équipe sur le levier prioritaire « ${label} » et engager chacun sur des actions concrètes cette semaine.`,
      },
      {
        heading: "Constat équipe",
        paragraph:
          "Le diagnostic du mois fait remonter ce levier comme premier facteur de perte de performance équipe. Présentez les chiffres-clés (réalisé vs objectif à date, écart) avant d'entrer dans le pourquoi.",
      },
      {
        heading: "Pourquoi ce levier est prioritaire",
        paragraph: diagnosis ||
          `« ${label} » est le levier qui pèse le plus sur la conversion à ce stade du parcours. Le travailler en équipe a un effet immédiat sur les autres ratios en aval.`,
      },
      {
        heading: "3 actions à appliquer cette semaine",
        bullets: teamActions,
      },
      {
        heading: "Engagement demandé à chaque conseiller",
        bullets: [
          firstAction
            ? `Mettre en oeuvre dès cette semaine : ${firstAction}`
            : "Choisir une action concrète à appliquer dès cette semaine.",
          "Partager un retour terrain (succès, blocage) au point hebdo.",
          "Mesurer l'évolution sur l'indicateur cible.",
        ],
      },
      {
        heading: "Conclusion manager",
        paragraph:
          "Reformulez l'engagement collectif, fixez la date du prochain point, et rappelez que vous serez disponible pour accompagner individuellement les conseillers qui en ont besoin.",
      },
    ],
  };
}

// ─── Builder 2 : Mise en pratique ─────────────────────────────────────────

export function buildTeamPracticeKit(expertiseId: ExpertiseRatioId): Kit {
  const label = leverLabel(expertiseId);
  const topPractices = getTopPractices(expertiseId, 3);

  // 3 exercices typés : jeu de rôle, cas réel, reformulation/script.
  // Le contenu de référence est un top practice (1 par exercice).
  const ex1 = topPractices[0] ?? "Travailler le geste-clé du levier en duo.";
  const ex2 = topPractices[1] ?? "Analyser un cas réel récent de l'équipe.";
  const ex3 = topPractices[2] ?? "Reformuler ensemble la séquence-clé.";

  return {
    title: `Mise en pratique — ${label}`,
    subtitle:
      "3 exercices terrain prêts à animer. À adapter selon la maturité de votre équipe.",
    sections: [
      {
        heading: "Durée recommandée",
        paragraph:
          "60 à 90 minutes. Prévoir 15-20 min par exercice + 10 min de débrief collectif.",
      },
      {
        heading: "Exercice 1 — Jeu de rôle",
        bullets: [
          `Référence : ${ex1}`,
          "Consigne manager : poser le contexte, distribuer les rôles (conseiller / client), observer.",
          "Consigne conseiller : appliquer la pratique, ne pas chercher la perfection — chercher l'engagement.",
          "Critère d'observation : la séquence-clé est-elle exécutée ? L'objection est-elle traitée sans esquive ?",
        ],
      },
      {
        heading: "Exercice 2 — Analyse d'un cas réel",
        bullets: [
          `Référence : ${ex2}`,
          "Consigne manager : choisir 1 cas récent (succès ou échec), le présenter en factuel sans juger.",
          "Consigne conseiller : identifier le moment-clé où le ratio s'est joué, proposer une alternative.",
          "Critère d'observation : la cause racine est-elle nommée ? L'alternative est-elle actionnable ?",
        ],
      },
      {
        heading: "Exercice 3 — Reformulation / objection",
        bullets: [
          `Référence : ${ex3}`,
          "Consigne manager : sortir 2-3 objections classiques sur ce levier, faire reformuler en duo.",
          "Consigne conseiller : reformuler à voix haute, varier les angles (rationnel, émotionnel, financier).",
          "Critère d'observation : la reformulation tient-elle face à une contre-objection ?",
        ],
      },
      {
        heading: "Débrief collectif",
        paragraph:
          "Faire ressortir ce qui a marché, ce qui a coincé, et ce que chacun retient. Choisir ensemble UN geste à appliquer dès la semaine suivante.",
      },
    ],
  };
}

// ─── Builder 3 : 4 points hebdo ───────────────────────────────────────────

export function buildTeamWeeklyFollowUpKit(expertiseId: ExpertiseRatioId): Kit {
  const label = leverLabel(expertiseId);

  return {
    title: `4 points hebdo — ${label}`,
    subtitle:
      "Trame de 4 points hebdomadaires pour piloter le levier sur un mois.",
    sections: [
      {
        heading: "Semaine 1 — Cadrage et engagement",
        bullets: [
          "Objectif du point : valider que chaque conseiller a engagé l'action choisie en réunion.",
          "Questions à poser : qu'as-tu testé ? Sur combien de cas ? Qu'est-ce qui a coincé ?",
          `Indicateur à vérifier : volume d'activité sur ${label.toLowerCase()} (a minima démarré).`,
          "Action à relancer : reformuler l'engagement pour ceux qui n'ont pas démarré.",
        ],
      },
      {
        heading: "Semaine 2 — Premiers retours terrain",
        bullets: [
          "Objectif du point : repérer les premiers signaux faibles (qui bloque, qui avance).",
          "Questions à poser : un cas concret cette semaine ? Qu'est-ce qui a changé dans ta pratique ?",
          `Indicateur à vérifier : évolution de l'indicateur ${label.toLowerCase()} vs semaine précédente.`,
          "Action à relancer : caler un binôme ou un coaching individuel pour ceux en difficulté.",
        ],
      },
      {
        heading: "Semaine 3 — Consolidation",
        bullets: [
          "Objectif du point : transformer l'essai — passer du test ponctuel à la routine.",
          "Questions à poser : sur tes 5 prochains cas, comment tu vas l'appliquer systématiquement ?",
          "Indicateur à vérifier : régularité (l'action est-elle faite à chaque opportunité ?).",
          "Action à relancer : valoriser publiquement les progrès observés.",
        ],
      },
      {
        heading: "Semaine 4 — Décision finale",
        bullets: [
          "Objectif du point : décider du cap — continuer / ajuster / passer à un autre levier.",
          "Questions à poser : qu'est-ce qu'on retient ? Qu'est-ce qu'on garde dans la routine équipe ?",
          `Indicateur à vérifier : impact mesuré sur ${label.toLowerCase()} (réalisé vs objectif à date).`,
          "Décision finale : continuer / ajuster / passer à un autre levier — tracer la décision dans le compte-rendu.",
        ],
      },
    ],
  };
}

// ─── Sélecteur générique ──────────────────────────────────────────────────

export function buildKit(kind: KitKind, expertiseId: ExpertiseRatioId): Kit {
  switch (kind) {
    case "meeting":
      return buildTeamMeetingKit(expertiseId);
    case "practice":
      return buildTeamPracticeKit(expertiseId);
    case "weekly":
      return buildTeamWeeklyFollowUpKit(expertiseId);
  }
}

// ─── Sérialisation texte (copier / télécharger) ───────────────────────────

/**
 * Sérialise un kit en markdown léger, exploitable copier-coller dans Notion,
 * Slack, Word, ou téléchargement direct en `.md`.
 */
export function serializeKitToMarkdown(kit: Kit): string {
  const lines: string[] = [];
  lines.push(`# ${kit.title}`);
  if (kit.subtitle) {
    lines.push("");
    lines.push(`_${kit.subtitle}_`);
  }
  for (const section of kit.sections) {
    lines.push("");
    lines.push(`## ${section.heading}`);
    if (section.paragraph) {
      lines.push("");
      lines.push(section.paragraph);
    }
    if (section.bullets && section.bullets.length > 0) {
      lines.push("");
      for (const b of section.bullets) {
        lines.push(`- ${b}`);
      }
    }
  }
  return lines.join("\n") + "\n";
}
