"use client";

import Link from "next/link";
import { Bot, ArrowRight } from "lucide-react";

/**
 * CoachIaBlock — bloc "Tu veux aller plus vite ?" sur /conseiller/ameliorer
 * (PR3.7.6 spec section 3).
 *
 * Ton produit, pas marketing :
 *   - pas de pricing affiché
 *   - pas d'"essai gratuit"
 *   - 1 phrase de bénéfice + 1 CTA "Activer mon coach"
 *
 * Le CTA pointe vers /souscrire (page existante qui gère le funnel
 * d'activation NXT Coaching). Le hook nxt_coaching côté ImprovementCatalogue
 * continue de gérer les états dynamiques (debrief offered / pending / etc.)
 * — ce bloc est uniquement un point d'entrée stable et discret.
 */
export function CoachIaBlock() {
  return (
    <section
      aria-label="Activer le coach IA"
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">
              Tu veux aller plus vite ?
            </h3>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              Active ton coach IA pour être guidé chaque semaine sur ton levier
              prioritaire.
            </p>
          </div>
        </div>
        <Link
          href="/souscrire"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          Activer mon coach
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
