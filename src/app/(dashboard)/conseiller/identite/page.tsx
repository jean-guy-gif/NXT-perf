"use client";

import { Fingerprint } from "lucide-react";
import { usePerformanceIdentity } from "@/hooks/use-performance-identity";
import { PerformanceIdentityCard } from "@/components/conseiller/identity/performance-identity-card";

/**
 * /conseiller/identite — sous-PR Coach-25.
 *
 * Page personnelle qui presente le portrait typologique du conseiller a
 * partir de son historique de saisies. Lecture pure de la donnee, pas de
 * coaching, pas de saisie additionnelle.
 */
export default function IdentitePage() {
  const profile = usePerformanceIdentity();

  return (
    <section className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Fingerprint className="h-3.5 w-3.5" />
          Mon identité de performance
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          Qui tu es professionnellement, lu dans ta donnée
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Ton portrait personnel est calculé à partir de tes saisies. Aucun
          jugement, aucune comparaison cachée — juste la lecture honnête de ta
          façon de produire, mois après mois.
        </p>
      </header>

      {profile ? (
        <PerformanceIdentityCard profile={profile} />
      ) : (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Connecte-toi pour découvrir ton portrait.
        </div>
      )}
    </section>
  );
}
