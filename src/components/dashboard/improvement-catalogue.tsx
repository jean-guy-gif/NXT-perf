"use client";

import { ClipboardList, Target, Dumbbell, BookOpen, ArrowRight } from "lucide-react";
import Link from "next/link";

interface ImprovementCatalogueProps {
  /** Current ratio gap (0-100). Higher = bigger gap to objective */
  gap?: number;
  /** Ratio name for context */
  ratioName?: string;
}

function estimateROI(gap: number | undefined): { plan: string; coaching: string; training: string; formation: string } {
  const g = gap ?? 20;
  if (g < 10) return { plan: "+10%", coaching: "+20%", training: "+15%", formation: "+20%" };
  if (g < 30) return { plan: "+15%", coaching: "+25%", training: "+20%", formation: "+25%" };
  return { plan: "+20%", coaching: "+35%", training: "+25%", formation: "+30%" };
}

export function ImprovementCatalogue({ gap, ratioName }: ImprovementCatalogueProps) {
  const roi = estimateROI(gap);
  const context = ratioName ? ` sur ${ratioName}` : "";

  const tools = [
    {
      icon: ClipboardList,
      emoji: "📋",
      title: "Plan 30 jours",
      price: "GRATUIT",
      priceColor: "text-green-500",
      description: `Une feuille de route personnalisée${context}`,
      roi: `ROI estimé : ${roi.plan} sur votre taux en 30 jours`,
      cta: "Générer mon plan",
      href: "/formation?tab=plan30",
    },
    {
      icon: Target,
      emoji: "🎯",
      title: "NXT Coaching",
      price: "9€/mois",
      priceColor: "text-foreground",
      description: `Coaching IA conversationnel adapté${context}`,
      roi: `ROI estimé : ${roi.coaching} sur votre taux en 60 jours`,
      cta: "Essayer gratuitement",
      href: "/souscrire",
    },
    {
      icon: Dumbbell,
      emoji: "🏋️",
      title: "NXT Training",
      price: "2 sessions offertes",
      priceColor: "text-green-500",
      description: `Simulations et exercices pratiques${context}`,
      roi: `ROI estimé : ${roi.training} sur votre taux en 45 jours`,
      cta: "Commencer",
      href: "/formation?tab=entrainer",
    },
    {
      icon: BookOpen,
      emoji: "📚",
      title: "Formation certifiante",
      price: "Prise en charge AGEFICE",
      priceColor: "text-amber-500",
      description: "Formation professionnelle certifiante",
      roi: `ROI estimé : ${roi.formation} sur votre taux durablement`,
      cta: "Voir le catalogue",
      href: "/formation?tab=financement",
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible">
      {tools.map((tool) => (
        <div
          key={tool.title}
          className="relative rounded-xl border border-border bg-card p-5 space-y-2 w-72 flex-shrink-0 snap-start sm:w-auto sm:p-4"
        >
          <span
            className={`absolute top-3 right-3 z-10 rounded-md bg-card px-2 py-0.5 text-[11px] font-medium leading-tight text-right max-w-[96px] sm:max-w-[88px] ${tool.priceColor}`}
          >
            {tool.price}
          </span>
          <div className="flex items-center gap-2 pr-[104px] sm:pr-[96px]">
            <span className="text-lg">{tool.emoji}</span>
            <h4 className="text-base font-semibold text-foreground sm:text-sm">{tool.title}</h4>
          </div>
          <p className="text-xs text-muted-foreground">{tool.description}</p>
          <p className="text-xs text-primary/70 sm:text-[10px]">{tool.roi}</p>
          <Link
            href={tool.href}
            className="inline-flex items-center gap-1 min-h-[44px] py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors sm:min-h-0 sm:py-0 sm:text-xs"
          >
            {tool.cta}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ))}
    </div>
  );
}
