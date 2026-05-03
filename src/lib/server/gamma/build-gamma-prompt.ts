/**
 * Gamma prompt builder (PR3.8.6 follow-up #3).
 *
 * SERVEUR UNIQUEMENT — reconstruit le contenu d'un kit prêt-à-présenter à
 * partir de `expertiseId` et de l'éventuel `context` envoyé par le client.
 * Le serveur ne fait JAMAIS confiance aveuglément à du texte client : tout
 * ce qui peut être recalculé (label, causes, actions, pratiques) l'est via
 * `coach-brain`. Seuls les nombres équipe (réalisé / objectif / écart) et
 * l'identification du conseiller référent viennent du client, sanitisés.
 *
 * Format de sortie : markdown léger avec `---` entre slides — Gamma découpe
 * sur ce séparateur en mode `textMode: "preserve"`.
 */

import {
  buildKit,
  type KitKind,
} from "@/lib/coaching/team-activation-kit";
import { RATIO_EXPERTISE, type ExpertiseRatioId } from "@/data/ratio-expertise";
import type { TeamKitContext } from "@/types/gamma";

interface BuildPromptInput {
  kitKind: KitKind;
  expertiseId: ExpertiseRatioId;
  context?: TeamKitContext;
}

export interface BuildPromptResult {
  inputText: string;
  numCards: number;
  additionalInstructions: string;
}

const KIND_LABEL: Record<KitKind, string> = {
  meeting: "Réunion équipe",
  practice: "Mise en pratique",
  weekly: "4 points hebdo",
};

const KIND_ADDITIONAL: Record<KitKind, string> = {
  meeting:
    "Brief équipe pour manager immobilier. Style commercial, motivant, premium. Présentation projetable en réunion.",
  practice:
    "Fiche d'animation d'exercices terrain pour manager immobilier. Style coaching, structuré, pragmatique.",
  weekly:
    "Trame de 4 points hebdomadaires de pilotage manager. Style suivi commercial, factuel, orienté action.",
};

const STYLE_INSTRUCTIONS =
  "Style visuel : haut de gamme, sobre, premium. Texte très lisible, titres très grands, peu de texte par slide. Maximum 3 bullets par slide. Style professionnel immobilier / coaching commercial. Éviter les longs paragraphes.";

const STATUS_LABEL: Record<NonNullable<TeamKitContext["rhythmStatus"]>, string> = {
  behind: "En retard",
  on_track: "Dans le rythme",
  ahead: "En avance",
};

// ─── Sanitisation des nombres venant du client ────────────────────────────

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("fr-FR");
}

function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${Math.round(n)} %`;
}

// ─── Builder principal ────────────────────────────────────────────────────

export function buildGammaPrompt(input: BuildPromptInput): BuildPromptResult {
  const { kitKind, expertiseId, context } = input;
  const expertise = RATIO_EXPERTISE[expertiseId];
  if (!expertise) {
    throw new Error(`Unknown expertiseId: ${expertiseId}`);
  }
  const leverLabel = expertise.label;

  // Reconstruit le kit côté serveur via coach-brain — source de vérité.
  const kit = buildKit(kitKind, expertiseId);

  if (kitKind === "meeting") {
    return buildMeetingPrompt(leverLabel, kit, context);
  }
  if (kitKind === "practice") {
    return buildPracticePrompt(leverLabel, kit);
  }
  return buildWeeklyPrompt(leverLabel, kit);
}

// ─── Meeting (le plus enrichi) ────────────────────────────────────────────

function buildMeetingPrompt(
  leverLabel: string,
  kit: ReturnType<typeof buildKit>,
  context: TeamKitContext | undefined,
): BuildPromptResult {
  // Sections du kit dans l'ordre :
  //   0: Constat équipe   (3 bullets génériques)
  //   1: Pourquoi prioritaire
  //   2: 3 actions
  //   3: Engagement
  //   4: Conclusion
  const causes = kit.sections[1]?.bullets ?? [];
  const teamActions = kit.sections[2]?.bullets ?? [];
  const engagement = kit.sections[3]?.bullets ?? [];
  const conclusion = kit.sections[4]?.bullets ?? [];

  const slides: string[] = [];

  // 1. Titre
  slides.push(
    [
      `# ${leverLabel}`,
      ``,
      `Brief équipe — activer le levier prioritaire.`,
    ].join("\n"),
  );

  // 2. Constat équipe (avec chiffres si fournis, sinon bullets génériques)
  const constatBullets: string[] = [];
  if (context && (isFiniteNumber(context.realised) || isFiniteNumber(context.toDate))) {
    if (isFiniteNumber(context.realised))
      constatBullets.push(`Réalisé équipe : ${fmtInt(context.realised)}`);
    if (isFiniteNumber(context.toDate))
      constatBullets.push(`Objectif à date : ${fmtInt(context.toDate)}`);
    if (isFiniteNumber(context.monthly))
      constatBullets.push(`Objectif mensuel : ${fmtInt(context.monthly)}`);
    if (isFiniteNumber(context.gapPct))
      constatBullets.push(`Écart : ${fmtPct(context.gapPct)}`);
    if (context.rhythmStatus)
      constatBullets.push(`Statut : ${STATUS_LABEL[context.rhythmStatus]}`);
  } else {
    constatBullets.push(...(kit.sections[0]?.bullets ?? []));
  }
  slides.push(["## Constat équipe", "", ...constatBullets.map((b) => `- ${b}`)].join("\n"));

  // 3. Pourquoi ce levier est prioritaire (ratio + causes)
  const pourquoiBullets: string[] = [];
  if (context?.ratio) {
    const r = context.ratio;
    const unit = r.isPercentage ? " %" : "";
    if (isFiniteNumber(r.teamAvg) && isFiniteNumber(r.target)) {
      pourquoiBullets.push(
        `Ratio « ${r.label} » — moyenne équipe ${fmtInt(r.teamAvg)}${unit} vs cible ${fmtInt(r.target)}${unit}.`,
      );
    } else if (r.label) {
      pourquoiBullets.push(`Ratio concerné : « ${r.label} ».`);
    }
  }
  for (const c of causes.slice(0, 3)) pourquoiBullets.push(c);
  slides.push(
    [
      "## Pourquoi ce levier est prioritaire",
      "",
      ...pourquoiBullets.slice(0, 4).map((b) => `- ${b}`),
    ].join("\n"),
  );

  // 4. S'appuyer sur ce qui fonctionne déjà (conseiller référent)
  if (context?.refAdvisor && context.refAdvisor.name) {
    const ra = context.refAdvisor;
    const refBullets: string[] = [];
    refBullets.push(
      ra.levelLabel
        ? `Conseiller référent : ${ra.name} (${ra.levelLabel}).`
        : `Conseiller référent : ${ra.name}.`,
    );
    if (isFiniteNumber(ra.ratioValue)) {
      refBullets.push(`Son résultat sur ce levier : ${fmtInt(ra.ratioValue)}.`);
    }
    if (isFiniteNumber(ra.gapVsAvgPct)) {
      refBullets.push(`Écart vs moyenne équipe : ${fmtPct(ra.gapVsAvgPct)}.`);
    }
    refBullets.push("À dupliquer : sa préparation et sa rigueur dans la séquence-clé.");
    slides.push(
      [
        "## S'appuyer sur ce qui fonctionne déjà",
        "",
        ...refBullets.slice(0, 4).map((b) => `- ${b}`),
      ].join("\n"),
    );
  }

  // 5. 3 actions à appliquer cette semaine
  slides.push(
    [
      "## 3 actions à appliquer cette semaine",
      "",
      ...teamActions.slice(0, 3).map((b) => `- ${b}`),
    ].join("\n"),
  );

  // 6. Engagement demandé à chaque conseiller
  slides.push(
    [
      "## Engagement demandé à chaque conseiller",
      "",
      ...engagement.slice(0, 3).map((b) => `- ${b}`),
    ].join("\n"),
  );

  // 7. Engagement collectif (Conclusion)
  slides.push(
    [
      "## Engagement collectif",
      "",
      ...conclusion.slice(0, 3).map((b) => `- ${b}`),
    ].join("\n"),
  );

  const inputText = slides.join("\n\n---\n\n");

  return {
    inputText,
    numCards: slides.length,
    additionalInstructions: `${KIND_ADDITIONAL.meeting} ${STYLE_INSTRUCTIONS}`,
  };
}

// ─── Practice (5 sections du kit + titre) ─────────────────────────────────

function buildPracticePrompt(
  leverLabel: string,
  kit: ReturnType<typeof buildKit>,
): BuildPromptResult {
  const slides: string[] = [];
  slides.push(
    [
      `# ${KIND_LABEL.practice} — ${leverLabel}`,
      ``,
      kit.subtitle ?? "3 exercices terrain prêts à animer.",
    ].join("\n"),
  );
  for (const section of kit.sections) {
    slides.push(serializeSection(section));
  }
  return {
    inputText: slides.join("\n\n---\n\n"),
    numCards: slides.length,
    additionalInstructions: `${KIND_ADDITIONAL.practice} ${STYLE_INSTRUCTIONS}`,
  };
}

// ─── Weekly (4 sections du kit + titre) ───────────────────────────────────

function buildWeeklyPrompt(
  leverLabel: string,
  kit: ReturnType<typeof buildKit>,
): BuildPromptResult {
  const slides: string[] = [];
  slides.push(
    [
      `# ${KIND_LABEL.weekly} — ${leverLabel}`,
      ``,
      kit.subtitle ?? "Trame de 4 points hebdomadaires.",
    ].join("\n"),
  );
  for (const section of kit.sections) {
    slides.push(serializeSection(section));
  }
  return {
    inputText: slides.join("\n\n---\n\n"),
    numCards: slides.length,
    additionalInstructions: `${KIND_ADDITIONAL.weekly} ${STYLE_INSTRUCTIONS}`,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function serializeSection(section: {
  heading: string;
  paragraph?: string;
  bullets?: string[];
}): string {
  const lines: string[] = [`## ${section.heading}`, ""];
  if (section.paragraph) {
    lines.push(section.paragraph);
    lines.push("");
  }
  if (section.bullets && section.bullets.length > 0) {
    for (const b of section.bullets.slice(0, 4)) lines.push(`- ${b}`);
  }
  return lines.join("\n").trim();
}
