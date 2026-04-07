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
    <div className="grid gap-3 sm:grid-cols-2">
      {tools.map((tool) => (
        <div key={tool.title} className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{tool.emoji}</span>
              <h4 className="text-sm font-semibold text-foreground">{tool.title}</h4>
            </div>
            <span className={`text-xs font-medium ${tool.priceColor}`}>{tool.price}</span>
          </div>
          <p className="text-xs text-muted-foreground">{tool.description}</p>
          <p className="text-[10px] text-primary/70">{tool.roi}</p>
          <Link
            href={tool.href}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {tool.cta}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ))}
    </div>
  );
}
