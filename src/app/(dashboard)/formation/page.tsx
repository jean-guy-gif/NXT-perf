"use client";

import { useState } from "react";
import { useRatios } from "@/hooks/use-ratios";
import { useUser } from "@/hooks/use-user";
import { generateFormationDiagnostic } from "@/lib/formation";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/charts/progress-bar";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  BookOpen,
  Dumbbell,
  GraduationCap,
  Phone,
  Home,
  Users,
  Handshake,
  Target,
  FileSignature,
  ShieldCheck,
  Clock,
  ExternalLink,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type FormationTab = "diagnostic" | "former" | "entrainer";

const priorityConfig = {
  1: { label: "P1", color: "bg-red-500/20 text-red-500", border: "border-red-500/30" },
  2: { label: "P2", color: "bg-orange-500/20 text-orange-500", border: "border-orange-500/30" },
  3: { label: "P3", color: "bg-yellow-500/20 text-yellow-400", border: "border-yellow-500/30" },
} as const;

const statusConfig = {
  ok: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10", label: "Bon niveau" },
  warning: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10", label: "Vigilance" },
  danger: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Action requise" },
};

// Catalogue des grands sujets de formation
const formationCatalog = [
  {
    id: "prospection",
    title: "Prospection",
    icon: Phone,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    description: "Maîtriser les techniques de prise de contact et de génération de leads qualifiés.",
    modules: [
      "Scripts d'appel et prise de rendez-vous",
      "Qualification des contacts entrants",
      "Prospection terrain et pige immobilière",
      "Stratégie de farming et réseaux",
      "Gestion du CRM et suivi des leads",
    ],
    duration: "8h de formation",
    level: "Tous niveaux",
  },
  {
    id: "vendeur",
    title: "Vendeur",
    icon: Home,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    description: "Accompagner le vendeur de l'estimation jusqu'à la signature du mandat.",
    modules: [
      "Méthodologie d'estimation (ACV, comparatif)",
      "Présentation de l'estimation au vendeur",
      "Argumentation prix et positionnement marché",
      "Rendez-vous de suivi vendeur",
      "Gestion des baisses de prix",
    ],
    duration: "10h de formation",
    level: "Confirmé",
  },
  {
    id: "acheteur",
    title: "Acheteur",
    icon: Users,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    description: "Qualifier, accompagner et convertir les acheteurs potentiels.",
    modules: [
      "Qualification du besoin acheteur",
      "Préparation et conduite de visite",
      "Gestion du portefeuille acheteurs chauds",
      "Relance et suivi post-visite",
      "Accompagnement au financement",
    ],
    duration: "8h de formation",
    level: "Tous niveaux",
  },
  {
    id: "closing",
    title: "Closing & Négociation",
    icon: Handshake,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    description: "Techniques de négociation et de closing pour transformer les offres en compromis.",
    modules: [
      "Techniques de négociation immobilière",
      "Gestion des offres multiples",
      "Traitement des objections",
      "Rédaction et présentation de l'offre",
      "Closing : du compromis à l'acte",
    ],
    duration: "6h de formation",
    level: "Confirmé / Expert",
  },
  {
    id: "exclusivite",
    title: "Exclusivité",
    icon: ShieldCheck,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    description: "Valoriser le mandat exclusif et convaincre le vendeur de ses avantages.",
    modules: [
      "Argumentaire exclusivité vs mandat simple",
      "Valorisation des services premium",
      "Plan de commercialisation exclusif",
      "Requalification simple → exclusif",
      "Fidélisation et recommandation",
    ],
    duration: "4h de formation",
    level: "Tous niveaux",
  },
  {
    id: "suivi",
    title: "Suivi & Organisation",
    icon: Clock,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    description: "Optimiser son organisation, son suivi de portefeuille et sa productivité.",
    modules: [
      "Organisation de la semaine type",
      "Suivi régulier du portefeuille mandats",
      "Reporting et analyse de ses ratios",
      "Gestion du temps et priorisation",
      "Outils digitaux et automatisation",
    ],
    duration: "4h de formation",
    level: "Tous niveaux",
  },
];

export default function FormationPage() {
  const { user } = useUser();
  const { computedRatios, ratioConfigs } = useRatios();
  const [activeTab, setActiveTab] = useState<FormationTab>("diagnostic");
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const diagnostic = user
    ? generateFormationDiagnostic(computedRatios, ratioConfigs, user.id)
    : null;

  if (!diagnostic) return null;

  const StatusIcon = statusConfig[diagnostic.overallStatus].icon;

  // Points d'amélioration basés sur le diagnostic
  const weakPoints = diagnostic.recommendations.filter((r) => r.priority <= 2);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Ma Formation</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab("diagnostic")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "diagnostic"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Target className="h-4 w-4" />
          Diagnostic
        </button>
        <button
          onClick={() => setActiveTab("former")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "former"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <GraduationCap className="h-4 w-4" />
          Se former
        </button>
        <button
          onClick={() => setActiveTab("entrainer")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "entrainer"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Dumbbell className="h-4 w-4" />
          S&apos;entraîner
        </button>
      </div>

      {/* ========== DIAGNOSTIC ========== */}
      {activeTab === "diagnostic" && (
        <>
          {/* Diagnostic Summary */}
          <div
            className={cn(
              "rounded-xl border p-6",
              diagnostic.overallStatus === "ok"
                ? "border-green-500/30 bg-green-500/5"
                : diagnostic.overallStatus === "warning"
                  ? "border-orange-500/30 bg-orange-500/5"
                  : "border-red-500/30 bg-red-500/5"
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full",
                  statusConfig[diagnostic.overallStatus].bg
                )}
              >
                <StatusIcon
                  className={cn("h-6 w-6", statusConfig[diagnostic.overallStatus].color)}
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Diagnostic synthétique
                </h2>
                <p className={cn("text-sm", statusConfig[diagnostic.overallStatus].color)}>
                  {statusConfig[diagnostic.overallStatus].label}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {diagnostic.recommendations.length === 0
                ? "Félicitations ! Tous vos ratios sont conformes aux objectifs de votre catégorie."
                : `${diagnostic.recommendations.length} domaine(s) de formation identifié(s). ${diagnostic.recommendations.filter((r) => r.priority === 1).length} priorité(s) haute(s).`}
            </p>
          </div>

          {/* Recommendations */}
          {diagnostic.recommendations.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Recommandations de formation
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {diagnostic.recommendations.map((rec) => {
                  const pConfig = priorityConfig[rec.priority];
                  return (
                    <div
                      key={rec.area}
                      className={cn(
                        "rounded-xl border bg-card p-5",
                        pConfig.border
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold text-foreground">
                            {rec.label}
                          </h3>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-bold",
                            pConfig.color
                          )}
                        >
                          {pConfig.label}
                        </span>
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Actuel</span>
                          <span className="font-medium text-foreground">
                            {rec.currentRatio.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Objectif</span>
                          <span className="font-medium text-foreground">
                            {rec.targetRatio}
                          </span>
                        </div>
                        <ProgressBar
                          value={
                            rec.targetRatio > 0
                              ? (rec.currentRatio / rec.targetRatio) * 100
                              : 0
                          }
                          status={rec.priority === 1 ? "danger" : rec.priority === 2 ? "warning" : "ok"}
                          showValue
                          size="sm"
                          className="mt-2"
                        />
                      </div>

                      <p className="mt-3 text-xs text-muted-foreground">
                        {rec.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== SE FORMER ========== */}
      {activeTab === "former" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold text-foreground">
                  Catalogue de formation
                </h2>
                <p className="text-sm text-muted-foreground">
                  {formationCatalog.length} thématiques disponibles — Cliquez sur un sujet pour voir le détail des modules.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {formationCatalog.map((topic) => {
              const Icon = topic.icon;
              const isExpanded = expandedTopic === topic.id;

              return (
                <div
                  key={topic.id}
                  className={cn(
                    "rounded-xl border bg-card transition-colors",
                    isExpanded ? topic.borderColor : "border-border"
                  )}
                >
                  {/* Header clickable */}
                  <button
                    onClick={() =>
                      setExpandedTopic(isExpanded ? null : topic.id)
                    }
                    className="flex w-full items-start gap-4 p-5 text-left"
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                        topic.bgColor
                      )}
                    >
                      <Icon className={cn("h-5 w-5", topic.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">
                          {topic.title}
                        </h3>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {topic.description}
                      </p>
                      <div className="mt-2 flex gap-3">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {topic.duration}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {topic.level}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded modules */}
                  {isExpanded && (
                    <div className="border-t border-border px-5 pb-5 pt-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Modules inclus
                      </p>
                      <ul className="space-y-2">
                        {topic.modules.map((mod, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-foreground"
                          >
                            <span className={cn("mt-0.5 text-xs", topic.color)}>●</span>
                            {mod}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          Contenu disponible prochainement — en cours de développement.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== S'ENTRAÎNER ========== */}
      {activeTab === "entrainer" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-5">
            <div className="flex items-center gap-3">
              <Dumbbell className="h-5 w-5 text-orange-500" />
              <div>
                <h2 className="font-semibold text-foreground">
                  Entraînez vos points d&apos;amélioration
                </h2>
                <p className="text-sm text-muted-foreground">
                  {weakPoints.length > 0
                    ? `${weakPoints.length} domaine(s) à travailler identifié(s) depuis votre diagnostic.`
                    : "Aucun point faible détecté. Continuez à performer !"}
                </p>
              </div>
            </div>
          </div>

          {/* Weak points to train on */}
          {weakPoints.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Vos axes de travail
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {weakPoints.map((rec) => {
                  const pConfig = priorityConfig[rec.priority];
                  return (
                    <div
                      key={rec.area}
                      className={cn(
                        "rounded-xl border bg-card p-5",
                        pConfig.border
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-semibold text-foreground">
                            {rec.label}
                          </h4>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-bold",
                            pConfig.color
                          )}
                        >
                          {pConfig.label}
                        </span>
                      </div>

                      <div className="mt-3">
                        <ProgressBar
                          value={
                            rec.targetRatio > 0
                              ? (rec.currentRatio / rec.targetRatio) * 100
                              : 0
                          }
                          status={rec.priority === 1 ? "danger" : "warning"}
                          showValue
                          size="sm"
                        />
                      </div>

                      <p className="mt-3 text-xs text-muted-foreground">
                        {rec.description}
                      </p>

                      {/* CTA vers NXT */}
                      <button
                        onClick={() =>
                          window.open("https://nxt.antigravity.fr", "_blank")
                        }
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        <Dumbbell className="h-4 w-4" />
                        S&apos;entraîner sur NXT
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All ratios status - quick view */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Vue complète de vos ratios
            </h3>
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {computedRatios.map((ratio) => {
                const config = ratioConfigs[ratio.ratioId as keyof typeof ratioConfigs];
                const isWeak = ratio.status !== "ok";
                return (
                  <div
                    key={ratio.ratioId}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          ratio.status === "ok"
                            ? "bg-green-500"
                            : ratio.status === "warning"
                              ? "bg-orange-500"
                              : "bg-red-500"
                        )}
                      />
                      <span className="text-sm text-foreground truncate">
                        {config?.name ?? ratio.ratioId}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={cn(
                          "text-sm font-bold",
                          ratio.status === "ok"
                            ? "text-green-500"
                            : ratio.status === "warning"
                              ? "text-orange-500"
                              : "text-red-500"
                        )}
                      >
                        {ratio.percentageOfTarget}%
                      </span>
                      {isWeak && (
                        <button
                          onClick={() =>
                            window.open("https://nxt.antigravity.fr", "_blank")
                          }
                          className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                        >
                          <Dumbbell className="h-3 w-3" />
                          NXT
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* NXT Connection banner */}
          <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-6">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20">
                <Dumbbell className="h-7 w-7 text-indigo-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground">
                  Plateforme NXT Training
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Entraînez-vous sur vos points faibles avec des exercices interactifs,
                  des mises en situation et un suivi personnalisé de votre progression.
                </p>
              </div>
              <button
                onClick={() =>
                  window.open("https://nxt.antigravity.fr", "_blank")
                }
                className="flex shrink-0 items-center gap-2 rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
              >
                Accéder à NXT
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
