"use client";

import { useMemo } from "react";
import { Target, Users } from "lucide-react";
import { useDirecteurScope } from "@/hooks/use-directeur-scope";
import { useUser } from "@/hooks/use-user";
import { useAppStore } from "@/stores/app-store";
import { ManagerTeamFormationView } from "@/components/manager/formation/manager-team-formation-view";
import { ConseillerFormationView } from "@/components/manager/formation/conseiller-formation-view";
import type { ScopeOverride } from "@/types/scope-override";

export default function DirecteurFormationPage() {
  const { scope, scopeId, teamContext } = useDirecteurScope();
  const { user: directeur } = useUser();
  const users = useAppStore((s) => s.users);
  const teamInfos = useAppStore((s) => s.teamInfos);

  // Conseiller scopé (uniquement en scope=conseiller)
  const scopedConseiller = useMemo(() => {
    if (scope !== "conseiller" || !scopeId) return null;
    return users.find((u) => u.id === scopeId) ?? null;
  }, [scope, scopeId, users]);

  // scopeOverride pour ManagerTeamFormationView (scope=equipe ou scope=agence)
  const scopeOverride = useMemo<ScopeOverride>(() => {
    const base: ScopeOverride = {};
    if (directeur?.institutionId) base.institutionId = directeur.institutionId;
    if (scope === "equipe" && scopeId) base.teamId = scopeId;
    return base;
  }, [directeur?.institutionId, scope, scopeId]);

  function resolveTeamLabel(teamId: string): string {
    const fromInfos = teamInfos.find((t) => t.id === teamId)?.name;
    if (fromInfos) return fromInfos;
    const manager = users.find((u) => u.teamId === teamId && u.role === "manager");
    return manager ? `Équipe de ${manager.firstName}` : "équipe";
  }

  // Titre + sous-titre dynamiques (pattern PR2d/PR2e/PR2f)
  const { title, subtitle } = useMemo(() => {
    if (scope === "conseiller" && scopeId) {
      const c = users.find((u) => u.id === scopeId);
      const baseName = c ? `${c.firstName} ${c.lastName}` : null;
      const ctxSuffix = teamContext ? ` (${resolveTeamLabel(teamContext)})` : "";
      return {
        title: baseName
          ? `Formation — ${baseName}${ctxSuffix}`
          : "Formation",
        subtitle: `Identifiez les axes faibles de ${c?.firstName ?? "ce conseiller"}, suivez son entraînement et explorez les outils de formation.`,
      };
    }
    if (scope === "equipe" && scopeId) {
      return {
        title: `Formation — ${resolveTeamLabel(scopeId)}`,
        subtitle:
          "Identifiez les axes faibles de l'équipe, lancez un plan d'équipe et suivez l'entraînement collectif.",
      };
    }
    return {
      title: "Ma Formation",
      subtitle:
        "Identifiez les axes faibles de votre agence, lancez un plan d'agence et suivez l'entraînement collectif.",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, scopeId, teamContext, users, teamInfos]);

  return (
    <div>
      {/* PAGE HEADER */}
      <header className="mx-auto max-w-6xl px-4 pt-8 pb-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Target className="h-3.5 w-3.5" />
          Plan de formation
        </div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{subtitle}</p>
      </header>

      {/* DISPATCH selon scope Directeur */}
      {scope === "conseiller" && scopedConseiller ? (
        <ConseillerFormationView conseiller={scopedConseiller} />
      ) : scope === "conseiller" ? (
        // scope=conseiller mais conseiller introuvable (edge case)
        <section className="mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-2xl font-bold text-foreground">
              Conseiller introuvable
            </h3>
            <p className="text-base leading-relaxed text-muted-foreground">
              Sélectionnez un conseiller valide dans le sélecteur de scope en haut.
            </p>
          </div>
        </section>
      ) : (
        <ManagerTeamFormationView
          scopeOverride={scopeOverride}
          entityLabel={scope === "agence" ? "agence" : "équipe"}
        />
      )}
    </div>
  );
}
