"use client";

import { useState, useMemo } from "react";
import { Users, Award, Target, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDirecteurScope } from "@/hooks/use-directeur-scope";
import { useUser } from "@/hooks/use-user";
import { useAppStore } from "@/stores/app-store";
import { ComparaisonInternalView } from "@/components/manager/comparaison/comparaison-internal-view";
import { TeamsComparisonTab } from "@/components/manager/comparaison/teams-comparison-tab";
import { EnrichedLeaderboardTab } from "@/components/manager/comparaison/enriched-leaderboard-tab";
import { DpiComparisonTab } from "@/components/manager/comparaison/dpi-comparison-tab";
import type { ScopeOverride } from "@/types/scope-override";

type TabKey = "interne" | "equipes" | "classement" | "dpi";

export default function DirecteurComparaisonPage() {
  const { scope, scopeId, teamContext } = useDirecteurScope();
  const { user: directeur } = useUser();
  const users = useAppStore((s) => s.users);
  const teamInfos = useAppStore((s) => s.teamInfos);

  const [activeTab, setActiveTab] = useState<TabKey>("interne");

  // Conseiller scopé (uniquement en scope=conseiller, pour Tab 1 IndivView)
  const scopedConseiller = useMemo(() => {
    if (scope !== "conseiller" || !scopeId) return null;
    return users.find((u) => u.id === scopeId) ?? null;
  }, [scope, scopeId, users]);

  // Override propagé aux composants Manager — calculé selon scope Directeur.
  const scopeOverride = useMemo<ScopeOverride>(() => {
    const base: ScopeOverride = {};
    if (directeur?.institutionId) base.institutionId = directeur.institutionId;
    if (scope === "equipe" && scopeId) {
      base.teamId = scopeId;
    } else if (scope === "conseiller" && scopeId) {
      // teamId : prendre le team du conseiller (ou teamContext si défini)
      const cTeamId = teamContext ?? scopedConseiller?.teamId ?? undefined;
      if (cTeamId) base.teamId = cTeamId;
      base.userId = scopeId;
    }
    return base;
  }, [
    directeur?.institutionId,
    scope,
    scopeId,
    teamContext,
    scopedConseiller,
  ]);

  // compareLevel pour Tab 2 (Classement NXT) selon scope Directeur
  const compareLevel: "team" | "agency" | "individual" =
    scope === "agence" ? "agency" : scope === "equipe" ? "team" : "individual";

  function resolveTeamLabel(teamId: string): string {
    const fromInfos = teamInfos.find((t) => t.id === teamId)?.name;
    if (fromInfos) return fromInfos;
    const manager = users.find((u) => u.teamId === teamId && u.role === "manager");
    return manager ? `Équipe de ${manager.firstName}` : "équipe";
  }

  // Titre + sous-titre dynamiques (pattern PR2d/PR2e)
  const { title, subtitle } = useMemo(() => {
    if (scope === "conseiller" && scopeId) {
      const c = users.find((u) => u.id === scopeId);
      const baseName = c ? `${c.firstName} ${c.lastName}` : null;
      const ctxSuffix = teamContext ? ` (${resolveTeamLabel(teamContext)})` : "";
      return {
        title: baseName
          ? `Comparaison — ${baseName}${ctxSuffix}`
          : "Comparaison",
        subtitle:
          "Mesurez le conseiller à un autre conseiller, à un profil cible ou au classement NXT — pour voir ce qui fait la différence.",
      };
    }
    if (scope === "equipe" && scopeId) {
      return {
        title: `Comparaison — ${resolveTeamLabel(scopeId)}`,
        subtitle:
          "Mesurez l'équipe à une autre équipe, à un profil cible ou au classement NXT — pour voir ce qui fait la différence.",
      };
    }
    return {
      title: "Ma Comparaison",
      subtitle:
        "Mesurez votre agence à une autre agence du réseau NXT, ou explorez le classement interne — pour voir ce qui fait la différence.",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, scopeId, teamContext, users, teamInfos]);

  return (
    <div>
      {/* PAGE HEADER */}
      <header className="mx-auto max-w-6xl px-4 pt-8 pb-4">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Users className="h-3.5 w-3.5" />
          Comparaison
        </div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{subtitle}</p>
      </header>

      {/* MICRO-SIGNATURE */}
      <div className="mx-auto max-w-6xl px-4 pb-6">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm italic text-muted-foreground">
            La comparaison telle qu&apos;un coach la ferait : pas juste des chiffres, mais
            un verdict en euros et en efficacité métier.
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          <TabButton
            active={activeTab === "interne"}
            onClick={() => setActiveTab("interne")}
            icon={Users}
          >
            Comparaison Interne
          </TabButton>
          <TabButton
            active={activeTab === "equipes"}
            onClick={() => setActiveTab("equipes")}
            icon={Users}
          >
            Classement NXT
          </TabButton>
          <TabButton
            active={activeTab === "classement"}
            onClick={() => setActiveTab("classement")}
            icon={Award}
          >
            Classement agence
          </TabButton>
          <TabButton
            active={activeTab === "dpi"}
            onClick={() => setActiveTab("dpi")}
            icon={Target}
          >
            Comparaison DPI
          </TabButton>
        </div>
      </div>

      {/* TAB CONTENT */}
      {activeTab === "interne" &&
        (scope === "agence" ? (
          <EmptyStateInterneAgence />
        ) : (
          <ComparaisonInternalView
            conseiller={scopedConseiller}
            scopeOverride={scopeOverride}
          />
        ))}
      {activeTab === "equipes" && (
        <TeamsComparisonTab
          scopeOverride={scopeOverride}
          compareLevel={compareLevel}
        />
      )}
      {activeTab === "classement" && (
        <EnrichedLeaderboardTab scopeOverride={scopeOverride} />
      )}
      {activeTab === "dpi" && (
        <DpiComparisonTab scopeOverride={scopeOverride} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

/**
 * Tab 1 (Comparaison Interne) en scope=agence Directeur :
 * TeamView a besoin d'un teamId pour fonctionner (compare équipe vs équipe).
 * Sans équipe ciblée, on affiche un message explicite plutôt qu'un empty state
 * silencieux. L'utilisateur doit sélectionner une équipe ou un conseiller dans
 * le ScopeSelector du shell pour activer ce tab.
 */
function EmptyStateInterneAgence() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="mb-3 text-2xl font-bold text-foreground">
          Sélectionnez une équipe ou un conseiller
        </h2>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground">
          Pour comparer en interne, choisissez une équipe ou un conseiller dans
          le sélecteur de scope en haut. Pour comparer votre agence au réseau
          NXT, ouvrez l&apos;onglet <strong>Classement NXT</strong>.
        </p>
      </div>
    </section>
  );
}
