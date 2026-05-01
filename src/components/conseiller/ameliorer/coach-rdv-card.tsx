"use client";

import { CalendarHeart, ExternalLink } from "lucide-react";
import { DEMO_COACH_CALENDAR_URL } from "@/config/coaching";

export function CoachRdvCard() {
  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <CalendarHeart className="h-3.5 w-3.5" />
        Coach NXT
      </div>
      <h3 className="mt-2 text-lg font-bold text-foreground">
        Prendre rendez-vous avec un coach
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Une session 1-to-1 avec un coach métier pour faire le point sur votre
        plan et lever les objections terrain.
      </p>
      <a
        href={DEMO_COACH_CALENDAR_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Ouvrir le calendrier
        <ExternalLink className="h-4 w-4" />
      </a>
    </section>
  );
}
