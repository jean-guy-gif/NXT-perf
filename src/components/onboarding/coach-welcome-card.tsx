"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  MessageCircle,
  Loader2,
} from "lucide-react";
import type { UserCategory } from "@/types/user";
import type { AgentStatus } from "@/types/user";

interface Props {
  firstName: string;
  category: UserCategory;
  agentStatus?: AgentStatus | null;
  profileType?: "AGENT" | "MANAGER" | "INSTITUTION" | "COACH" | "RESEAU" | null;
}

interface OnboardingWelcome {
  title: string;
  welcomeMessage: string;
  promise: string[];
  openingQuestion: string;
}

/**
 * CoachWelcomeCard — sous-PR Coach-11.
 *
 * Affiché sur la dernière étape onboarding (GPS), AVANT les inputs CA /
 * commission. Présente le Coach NXT au nouveau user avec un message
 * personnalisé au profil saisi. Voix Tedesco terrain.
 *
 * Fetch lazy /api/onboarding-welcome au mount. Loading state animé.
 * Si RAG fail (rare car onboarding 1x par compte), composant retourne null.
 */
export function CoachWelcomeCard({
  firstName,
  category,
  agentStatus,
  profileType,
}: Props) {
  const [welcome, setWelcome] = useState<OnboardingWelcome | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firstName || !category) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/onboarding-welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        category,
        agentStatus,
        profileType,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { welcome: OnboardingWelcome | null };
        if (!cancelled && data.welcome) setWelcome(data.welcome);
      })
      .catch((err) => {
        console.error("[coach-welcome-card] fetch failed", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [firstName, category, agentStatus, profileType]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-indigo-50/20 p-6 dark:border-indigo-900/40 dark:from-indigo-950/30 dark:to-indigo-950/10">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Coach NXT prépare ton accueil...
          </span>
        </div>
      </section>
    );
  }

  if (!welcome) return null;

  return (
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-indigo-50/20 p-6 dark:border-indigo-900/40 dark:from-indigo-950/30 dark:to-indigo-950/10">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
            Coach NXT
          </p>
          <h2 className="text-lg font-bold text-foreground">{welcome.title}</h2>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground">
        {welcome.welcomeMessage}
      </p>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
          Voilà ce que je vais t&apos;apporter
        </p>
        <ul className="space-y-1.5">
          {welcome.promise.map((p, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="leading-relaxed">{p}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-lg border border-indigo-200/60 bg-card p-3 dark:border-indigo-900/40">
        <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          <MessageCircle className="h-3.5 w-3.5" />
          Pour démarrer
        </p>
        <p className="text-sm italic leading-relaxed text-foreground">
          {welcome.openingQuestion}
        </p>
      </div>
    </section>
  );
}
