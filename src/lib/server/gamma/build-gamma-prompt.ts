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

// PR3.8.6 follow-up #5 — instructions fortes pour forcer Gamma à conserver
// les chiffres tels quels et les afficher visuellement en grand. Sans cela,
// Gamma peut paraphraser ou résumer les données chiffrées.
const NUMERIC_INSTRUCTIONS =
  "Do not omit numerical data. Always display the exact values provided. If numerical values are provided, they must be displayed prominently in the slide using large typography. Do not rewrite or remove the provided numbers. Keep numerical data exact and visible.";

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

  // 2. Constat équipe — FORMAT FORCÉ label/value sur lignes séparées quand
  // des chiffres sont fournis. Gamma doit afficher les valeurs telles
  // quelles, en grand (cf. NUMERIC_INSTRUCTIONS dans additionalInstructions).
  // Si aucun chiffre n'est fourni, fallback sur les bullets génériques du kit.
  const hasNumericContext =
    context &&
    (isFiniteNumber(context.realised) ||
      isFiniteNumber(context.toDate) ||
      isFiniteNumber(context.monthly) ||
      isFiniteNumber(context.gapPct) ||
      !!context.rhythmStatus);
  const constatLines: string[] = ["## Constat équipe", ""];
  if (hasNumericContext && context) {
    const realisedStr = isFiniteNumber(context.realised)
      ? fmtInt(context.realised)
      : "—";
    const toDateStr = isFiniteNumber(context.toDate)
      ? fmtInt(context.toDate)
      : "—";
    const monthlyStr = isFiniteNumber(context.monthly)
      ? fmtInt(context.monthly)
      : "—";
    const gapStr = isFiniteNumber(context.gapPct)
      ? fmtPct(context.gapPct)
      : "—";
    const statusStr = context.rhythmStatus
      ? STATUS_LABEL[context.rhythmStatus]
      : "—";
    constatLines.push(
      `**Réalisé équipe :**`,
      realisedStr,
      ``,
      `**Objectif à date :**`,
      toDateStr,
      ``,
      `**Objectif mensuel :**`,
      monthlyStr,
      ``,
      `**Écart :**`,
      gapStr,
      ``,
      `**Statut :**`,
      statusStr,
    );
  } else {
    for (const b of kit.sections[0]?.bullets ?? []) {
      constatLines.push(`- ${b}`);
    }
  }
  slides.push(constatLines.join("\n"));

  // 3. Pourquoi ce levier est prioritaire — ratio en label/value forcé +
  // 3 causes en bullets. Format mixte délibéré : on veut que les chiffres
  // ratio sortent visuellement de la liste à puces.
  const pourquoiLines: string[] = ["## Pourquoi ce levier est prioritaire", ""];
  if (
    context?.ratio &&
    isFiniteNumber(context.ratio.teamAvg) &&
    isFiniteNumber(context.ratio.target)
  ) {
    const r = context.ratio;
    const unit = r.isPercentage ? " %" : "";
    pourquoiLines.push(
      `**Ratio équipe :** ${fmtInt(r.teamAvg)}${unit}`,
      `**Objectif :** ${fmtInt(r.target)}${unit}`,
      ``,
    );
  } else if (context?.ratio?.label) {
    pourquoiLines.push(`**Ratio concerné :** « ${context.ratio.label} »`, ``);
  }
  for (const c of causes.slice(0, 3)) pourquoiLines.push(`- ${c}`);
  slides.push(pourquoiLines.join("\n"));

  // 4. S'appuyer sur ce qui fonctionne déjà — conseiller référent avec
  // chiffres en label/value forcé.
  if (context?.refAdvisor && context.refAdvisor.name) {
    const ra = context.refAdvisor;
    const refLines: string[] = ["## S'appuyer sur ce qui fonctionne déjà", ""];
    refLines.push(
      `**Top performer :** ${ra.name}${ra.levelLabel ? ` (${ra.levelLabel})` : ""}`,
    );
    if (isFiniteNumber(ra.ratioValue)) {
      refLines.push(`**Résultat :** ${fmtInt(ra.ratioValue)}`);
    }
    if (isFiniteNumber(ra.gapVsAvgPct)) {
      refLines.push(`**Écart vs moyenne équipe :** ${fmtPct(ra.gapVsAvgPct)}`);
    }
    refLines.push(
      ``,
      `À dupliquer : sa préparation et sa rigueur dans la séquence-clé.`,
    );
    slides.push(refLines.join("\n"));
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
    additionalInstructions: `${KIND_ADDITIONAL.meeting} ${STYLE_INSTRUCTIONS} ${NUMERIC_INSTRUCTIONS}`,
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
    additionalInstructions: `${KIND_ADDITIONAL.practice} ${STYLE_INSTRUCTIONS} ${NUMERIC_INSTRUCTIONS}`,
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
    additionalInstructions: `${KIND_ADDITIONAL.weekly} ${STYLE_INSTRUCTIONS} ${NUMERIC_INSTRUCTIONS}`,
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
