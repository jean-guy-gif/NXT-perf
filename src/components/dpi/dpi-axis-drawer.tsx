"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, TrendingUp, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DPIAxis } from "@/lib/dpi-axes";
import type { ComputedRatio, RatioConfig, RatioId } from "@/types/ratios";
import type { PeriodResults } from "@/types/results";

export interface DPIAxisDrawerProps {
  open: boolean;
  onClose: () => void;
  axis: DPIAxis | null;
  initialScore?: number | null;
  results: PeriodResults | null;
  computedRatios: ComputedRatio[];
  ratioConfigs: Record<RatioId, RatioConfig>;
  plan30Total: number;
  plan30Done: number;
  hasActivePlan: boolean;
  hasCustomObjectif: boolean;
  agencyAvgActValue?: number;
}

const AXIS_META: Record<string, {
  emoji: string;
  meaning: string;
  lecture: string;
}> = {
  intensite_commerciale: {
    emoji: "🔥",
    meaning: "Ton volume d'effort commercial quotidien",
    lecture: "Volume d'effort pur : contacts, RDV, relances.",
  },
  generation_opportunites: {
    emoji: "🎯",
    meaning: "Ta capacité à créer du business nouveau",
    lecture: "Entrée business : nouveaux contacts → estimations → mandats.",
  },
  solidite_portefeuille: {
    emoji: "📦",
    meaning: "La qualité réelle de ton stock de mandats",
    lecture: "Stock : volume + % exclusivité + santé du portefeuille.",
  },
  maitrise_ratios: {
    emoji: "⚙️",
    meaning: "Ton efficacité commerciale étape par étape",
    lecture: "Conversion : comment tu transformes chaque étape de la chaîne.",
  },
  valorisation_economique: {
    emoji: "💰",
    meaning: "Ta capacité à défendre la valeur de chaque transaction",
    lecture: "Marge : CA par acte, commission défendue.",
  },
  pilotage_strategique: {
    emoji: "🧭",
    meaning: "Ta capacité à piloter et décider",
    lecture: "Direction : objectifs, plans d'action, pilotage.",
  },
};

function formatDelta(current: number, initial?: number | null): string {
  if (initial === null || initial === undefined) return "";
  const delta = Math.round(current - initial);
  if (delta > 0) return `+${delta} pts vs référence`;
  if (delta < 0) return `${delta} pts vs référence`;
  return "stable";
}

function getDeltaColor(current: number, initial?: number | null): string {
  if (initial === null || initial === undefined) return "text-muted-foreground";
  const delta = current - initial;
  if (delta > 5) return "text-emerald-500";
  if (delta < -5) return "text-red-500";
  return "text-muted-foreground";
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

function StatusDot({ status }: { status: "ok" | "warning" | "danger" }) {
  const colors = {
    ok: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
  };
  return <span className={cn("inline-block h-2 w-2 rounded-full", colors[status])} />;
}

export function DPIAxisDrawer({
  open,
  onClose,
  axis,
  initialScore,
  results,
  computedRatios,
  ratioConfigs,
  plan30Total,
  plan30Done,
  hasActivePlan,
  hasCustomObjectif,
  agencyAvgActValue,
}: DPIAxisDrawerProps) {
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!open) {
      setRendered(false);
      return;
    }
    const timeout = setTimeout(() => setRendered(true), 50);
    return () => clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open || !axis) return null;

  const meta = AXIS_META[axis.id] ?? { emoji: "📊", meaning: axis.label, lecture: "" };
  const delta =
    initialScore !== undefined && initialScore !== null
      ? Math.round(axis.score - initialScore)
      : null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto",
          "border-l border-border bg-card shadow-2xl",
          "animate-in slide-in-from-right duration-300"
        )}
      >
        {/* Header sticky */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card/95 p-5 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="text-3xl">{meta.emoji}</div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{axis.label}</h2>
              <p className="text-sm text-muted-foreground">{meta.meaning}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Score + delta */}
        <div className="border-b border-border px-5 py-6">
          <div className="flex items-baseline gap-3">
            <span className={cn("text-5xl font-bold", getScoreColor(axis.score))}>
              {Math.round(axis.score)}
            </span>
            <span className="text-2xl text-muted-foreground">/100</span>
            {delta !== null && (
              <span
                className={cn(
                  "ml-auto text-sm font-semibold",
                  getDeltaColor(axis.score, initialScore)
                )}
              >
                {formatDelta(axis.score, initialScore)}
              </span>
            )}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{meta.lecture}</p>
        </div>

        {/* Contenu spécifique par axe */}
        <div className="space-y-6 p-5">
          {!rendered ? (
            <div className="space-y-4">
              <div className="h-32 animate-pulse rounded-lg bg-muted" />
              <div className="h-24 animate-pulse rounded-lg bg-muted" />
              <div className="h-16 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : (
            renderAxisContent(axis, results, computedRatios, ratioConfigs, {
              plan30Total,
              plan30Done,
              hasActivePlan,
              hasCustomObjectif,
              agencyAvgActValue,
            })
          )}
        </div>
      </div>
    </>
  );
}

// ─── Renderers par axe ──────────────────────────────────────────────────

interface RenderContext {
  plan30Total: number;
  plan30Done: number;
  hasActivePlan: boolean;
  hasCustomObjectif: boolean;
  agencyAvgActValue?: number;
}

function renderAxisContent(
  axis: DPIAxis,
  results: PeriodResults | null,
  computedRatios: ComputedRatio[],
  ratioConfigs: Record<RatioId, RatioConfig>,
  ctx: RenderContext
) {
  if (!results) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Aucune donnée de saisie sur la période. Renseigne tes indicateurs
        pour activer le diagnostic précis de cet axe.
      </div>
    );
  }

  switch (axis.id) {
    case "intensite_commerciale":
      return renderIntensite(results);
    case "generation_opportunites":
      return renderGeneration(results);
    case "solidite_portefeuille":
      return renderSolidite(results);
    case "maitrise_ratios":
      return renderMaitrise(computedRatios, ratioConfigs, ctx);
    case "valorisation_economique":
      return renderValorisation(results, ctx);
    case "pilotage_strategique":
      return renderPilotage(computedRatios, ctx);
    default:
      return null;
  }
}

function ContributorRow({
  label,
  value,
  target,
  status,
  hint,
}: {
  label: string;
  value: string | number;
  target?: string | number;
  status?: "ok" | "warning" | "danger";
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 py-2.5 last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {status && <StatusDot status={status} />}
          {label}
        </div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-foreground">{value}</div>
        {target !== undefined && (
          <div className="text-xs text-muted-foreground">cible : {target}</div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
      {children}
    </h3>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <SectionTitle>{title}</SectionTitle>
      <div className="rounded-lg bg-muted/30 p-4">{children}</div>
    </div>
  );
}

// Axe 1 — Intensité Commerciale
function renderIntensite(results: PeriodResults) {
  return (
    <>
      <Section title="Comment c'est calculé">
        <p className="mb-3 text-sm text-muted-foreground">
          L&apos;axe mesure l&apos;intensité pure de ton activité commerciale :
          combien d&apos;efforts tu mets chaque mois sur le terrain.
        </p>
        <ContributorRow
          label="Contacts totaux (période)"
          value={results.prospection.contactsTotaux}
          hint="Nombre total de contacts prospectés"
        />
        <ContributorRow
          label="RDV d'estimation pris"
          value={results.prospection.rdvEstimation}
          hint="RDV décrochés lors de la prospection"
        />
        <ContributorRow
          label="RDV de suivi vendeur"
          value={results.vendeurs.rdvSuivi}
          hint="RDV de relance / suivi sur mandats en cours"
        />
      </Section>

      <Section title="Ce que ça signifie">
        <p className="text-sm leading-relaxed text-foreground">
          Un score d&apos;intensité faible signifie que tu n&apos;es pas assez présent
          sur le terrain. Sans volume d&apos;effort, même la meilleure efficacité
          ne suffit pas — la prospection est un jeu de nombres avant d&apos;être
          un jeu de technique.
        </p>
      </Section>

      <ActionRecommandation />
    </>
  );
}

// Axe 2 — Génération d'Opportunités
function renderGeneration(results: PeriodResults) {
  return (
    <>
      <Section title="Comment c'est calculé">
        <p className="mb-3 text-sm text-muted-foreground">
          L&apos;axe mesure ta capacité à transformer l&apos;effort en opportunités
          concrètes : nouveaux contacts qui deviennent estimations, puis mandats.
        </p>
        <ContributorRow
          label="Contacts entrants"
          value={results.prospection.contactsTotaux}
          hint="Le haut de ton tunnel"
        />
        <ContributorRow
          label="Estimations réalisées"
          value={results.vendeurs.estimationsRealisees}
          hint="Rendez-vous d'estimation effectivement tenus"
        />
        <ContributorRow
          label="Mandats signés"
          value={results.vendeurs.mandatsSignes}
          hint="Le résultat de l'entonnoir"
        />
      </Section>

      <Section title="Ce que ça signifie">
        <p className="text-sm leading-relaxed text-foreground">
          L&apos;entonnoir Contacts → Estimations → Mandats est ton moteur de
          croissance. Si cet axe est bas, soit tu manques de volume en
          entrée, soit ta conversion aux étapes intermédiaires est faible.
        </p>
      </Section>

      <ActionRecommandation />
    </>
  );
}

// Axe 3 — Solidité du Portefeuille
function renderSolidite(results: PeriodResults) {
  const totalMandats = results.vendeurs.mandats.length;
  const mandatsExclusifs = results.vendeurs.mandats.filter(
    (m) => m.type === "exclusif"
  ).length;
  const pctExclu =
    totalMandats > 0 ? Math.round((mandatsExclusifs / totalMandats) * 100) : 0;

  return (
    <>
      <Section title="Comment c'est calculé">
        <p className="mb-3 text-sm text-muted-foreground">
          Score = (stock de mandats + % exclusivité) / 2. La pondération à
          parts égales reflète qu&apos;un gros stock SANS exclusivité vaut autant
          qu&apos;un petit stock bien sécurisé.
        </p>
        <ContributorRow
          label="Mandats en stock"
          value={totalMandats}
          hint="Nombre total de mandats actifs"
        />
        <ContributorRow
          label="Dont exclusifs"
          value={`${mandatsExclusifs} (${pctExclu}%)`}
          hint="Mandats protégés de la concurrence"
        />
        <ContributorRow
          label="Requalifications simple → exclu"
          value={results.vendeurs.requalificationSimpleExclusif}
          hint="Indicateur qualitatif : transformations réalisées"
        />
        <ContributorRow
          label="Baisses de prix consenties"
          value={results.vendeurs.baissePrix}
          hint="Indicateur inverse : moins c'est mieux (signe de mauvais pricing amont)"
        />
      </Section>

      <Section title="Ce que ça signifie">
        <p className="text-sm leading-relaxed text-foreground">
          Un portefeuille solide, c&apos;est un stock suffisant ET qualitatif.
          Les baisses de prix élevées sont un signal d&apos;alerte : tu as
          peut-être accepté des mandats surévalués en amont.
        </p>
      </Section>

      <ActionRecommandation />
    </>
  );
}

// Axe 4 — Maîtrise des Ratios
function renderMaitrise(
  computedRatios: ComputedRatio[],
  ratioConfigs: Record<RatioId, RatioConfig>,
  ctx: RenderContext
) {
  return (
    <>
      <Section title="Comment c'est calculé">
        <p className="mb-3 text-sm text-muted-foreground">3 composants pondérés :</p>
        <ContributorRow
          label="Tes 8 ratios de conversion (50%)"
          value="moyenne des ratios"
          hint="Voir détail ci-dessous"
        />
        <ContributorRow
          label="Plan 30j en cours (25%)"
          value={
            ctx.plan30Total > 0 ? `${ctx.plan30Done}/${ctx.plan30Total} actions` : "—"
          }
          hint="Actions validées dans le plan actif"
        />
        <ContributorRow
          label="NXT Training actif (25%)"
          value={ctx.hasActivePlan ? "Activé" : "Non activé"}
          hint="Engagement dans le programme d'entraînement"
        />
      </Section>

      <Section title="Détail de tes 8 ratios">
        {computedRatios.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun ratio calculable pour cette période.
          </p>
        ) : (
          computedRatios.map((r) => {
            const config = ratioConfigs[r.ratioId as RatioId];
            return (
              <ContributorRow
                key={r.ratioId}
                label={config?.name ?? r.ratioId}
                value={`${Math.round(r.percentageOfTarget)}%`}
                target="100%"
                status={
                  r.status === "ok"
                    ? "ok"
                    : r.status === "warning"
                    ? "warning"
                    : "danger"
                }
              />
            );
          })
        )}
      </Section>

      <ActionRecommandation />
    </>
  );
}

// Axe 5 — Valorisation Économique
function renderValorisation(results: PeriodResults, ctx: RenderContext) {
  const caParActe =
    results.ventes.actesSignes > 0
      ? Math.round(results.ventes.chiffreAffaires / results.ventes.actesSignes)
      : 0;

  return (
    <>
      <Section title="Comment c'est calculé">
        <p className="mb-3 text-sm text-muted-foreground">
          Aujourd&apos;hui, cet axe mesure une seule chose : ta capacité à
          défendre un CA élevé par transaction.
        </p>
        <ContributorRow
          label="CA généré"
          value={`${results.ventes.chiffreAffaires.toLocaleString("fr-FR")} €`}
          hint="Total de la période"
        />
        <ContributorRow
          label="Actes signés"
          value={results.ventes.actesSignes}
          hint="Nombre de ventes concrétisées"
        />
        <ContributorRow
          label="CA moyen par acte"
          value={`${caParActe.toLocaleString("fr-FR")} €`}
          hint="Indicateur clé de valorisation"
        />
        {ctx.agencyAvgActValue && (
          <ContributorRow
            label="Cible agence"
            value={`${ctx.agencyAvgActValue.toLocaleString("fr-FR")} €`}
            hint="Définie dans tes objectifs"
          />
        )}
      </Section>

      <Section title="Ce qui arrive prochainement">
        <p className="text-sm leading-relaxed text-foreground">
          <strong>NXT Finance (bientôt disponible)</strong> enrichira ce
          diagnostic avec : écart estimation / prix signé, taux de négociation
          consenti, pilotage de la marge par type de mandat, défense du prix
          face aux acheteurs.
        </p>
      </Section>

      <ActionRecommandation />
    </>
  );
}

// Axe 6 — Pilotage Stratégique
function renderPilotage(computedRatios: ComputedRatio[], ctx: RenderContext) {
  const ratiosOk = computedRatios.filter((r) => r.status === "ok").length;
  const ratiosTotal = computedRatios.length;
  const ratioOkPct = ratiosOk / Math.max(ratiosTotal, 1);

  return (
    <>
      <Section title="Comment c'est calculé">
        <p className="mb-3 text-sm text-muted-foreground">3 composants pondérés :</p>
        <ContributorRow
          label="Ratios au vert (40%)"
          value={`${ratiosOk}/${ratiosTotal}`}
          hint="Ratios qui atteignent leur cible"
          status={ratioOkPct >= 0.7 ? "ok" : ratioOkPct >= 0.4 ? "warning" : "danger"}
        />
        <ContributorRow
          label="Objectif personnalisé (30%)"
          value={ctx.hasCustomObjectif ? "Défini" : "Non défini"}
          status={ctx.hasCustomObjectif ? "ok" : "danger"}
          hint="As-tu fixé un objectif CA annuel pour ton activité ?"
        />
        <ContributorRow
          label="Engagement dans un plan (30%)"
          value={
            ctx.hasActivePlan
              ? `Plan actif (${ctx.plan30Done}/${ctx.plan30Total})`
              : "Aucun plan actif"
          }
          status={ctx.hasActivePlan ? "ok" : "warning"}
          hint="Es-tu engagé dans une démarche d'amélioration structurée ?"
        />
      </Section>

      <Section title="Ce que ça signifie">
        <p className="text-sm leading-relaxed text-foreground">
          Le pilotage, c&apos;est la capacité à se fixer un cap, à mesurer où
          on en est, et à s&apos;engager dans des actions correctrices. Un score
          bas signale qu&apos;il manque l&apos;un des 3 piliers : visibilité, objectif,
          ou engagement actif.
        </p>
      </Section>

      <ActionRecommandation />
    </>
  );
}

// Action recommandée générique
function ActionRecommandation() {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Target className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="mb-1 text-sm font-semibold text-foreground">
            Prochaine action recommandée
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Génère un plan 30j focalisé sur le ratio le plus pénalisant de
            cet axe. Ton plan sera construit à partir de notre expertise
            coaching dédiée à ce levier.
          </p>
          <Link
            href="/formation?tab=plan30"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <TrendingUp className="h-3 w-3" />
            Booster cet axe
          </Link>
        </div>
      </div>
    </div>
  );
}
