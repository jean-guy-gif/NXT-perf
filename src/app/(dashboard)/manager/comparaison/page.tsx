"use client";

import { useState } from "react";
import { Users, Award, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useManagerScope } from "@/hooks/use-manager-scope";
import { useManagerView } from "@/hooks/use-manager-view";
import { useTeamResults } from "@/hooks/team/use-team-results";
import { useAppStore } from "@/stores/app-store";
import { ManagerViewSwitcher } from "@/components/manager/manager-view-switcher";
import { ComparaisonInternalView } from "@/components/manager/comparaison/comparaison-internal-view";
import { TeamsComparisonTab } from "@/components/manager/comparaison/teams-comparison-tab";
import { EnrichedLeaderboardTab } from "@/components/manager/comparaison/enriched-leaderboard-tab";
import { DpiComparisonTab } from "@/components/manager/comparaison/dpi-comparison-tab";
import { ConseillerProxy } from "@/components/manager/individual/conseiller-proxy";
import { NoAdvisorSelected } from "@/components/manager/individual/no-advisor-selected";
import ConseillerComparaisonPage from "@/app/(dashboard)/conseiller/comparaison/page";

type TabKey = "interne" | "equipes" | "classement" | "dpi";

export default function ManagerComparaisonPage() {
  const { conseiller, isIndividualScope } = useManagerScope();
  const { isIndividual, selectedAdvisorId } = useManagerView();
  const { conseillers } = useTeamResults();
  const isDemo = useAppStore((s) => s.isDemo);

  const [activeTab, setActiveTab] = useState<TabKey>("interne");

  // Empty state — équipe vide en mode prod réel
  if (conseillers.length === 0 && !isDemo) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-foreground">
            Votre équipe est vide pour l&apos;instant
          </h2>
          <p className="mb-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Partagez votre code équipe pour inviter vos conseillers. Vous pourrez les
            comparer entre eux dès qu&apos;ils auront saisi leurs résultats.
          </p>
          <a
            href="/parametres/equipe"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          >
            Gérer mon équipe
          </a>
        </div>
      </section>
    );
  }

  return (
    <div>
      {/* PAGE HEADER */}
      <header className="mx-auto max-w-6xl px-4 pt-8 pb-4">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Users className="h-3.5 w-3.5" />
          Comparaison
        </div>
        <h1 className="text-3xl font-bold text-foreground">Comparaison</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {isIndividualScope && conseiller
            ? `Mesurez ${conseiller.firstName} à un autre conseiller, à un profil cible ou au classement NXT — pour voir ce qui fait la différence.`
            : "Mesurez votre équipe à une autre équipe, à un profil cible ou au classement NXT — pour voir ce qui fait la différence."}
        </p>
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

      {/* PR3.8.2 — Toggle Collectif/Individuel + sélecteur conseiller V3 */}
      <div className="mx-auto max-w-6xl px-4 pb-4">
        <ManagerViewSwitcher />
      </div>

      {/* PR3.8.5 — Mode Individuel : on rend la vue Conseiller "Ma
          comparaison" telle quelle via ConseillerProxy. Les tabs Manager
          (interne / classement / DPI) ne s'affichent que dans le mode
          Collectif. */}
      {isIndividual ? (
        selectedAdvisorId ? (
          <div className="mx-auto max-w-6xl px-4">
            <ConseillerProxy advisorId={selectedAdvisorId}>
              <ConseillerComparaisonPage />
            </ConseillerProxy>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl px-4">
            <NoAdvisorSelected />
          </div>
        )
      ) : (
        <ManagerCollectiveTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isIndividualScope={isIndividualScope}
          conseiller={conseiller}
        />
      )}
    </div>
  );
}

interface ManagerCollectiveTabsProps {
  activeTab: TabKey;
  setActiveTab: (t: TabKey) => void;
  isIndividualScope: boolean;
  conseiller: ReturnType<typeof useManagerScope>["conseiller"];
}

function ManagerCollectiveTabs({
  activeTab,
  setActiveTab,
  isIndividualScope,
  conseiller,
}: ManagerCollectiveTabsProps) {
  return (
    <>
      {/* TABS */}
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          <TabButton active={activeTab === "interne"} onClick={() => setActiveTab("interne")} icon={Users}>
            Comparaison Interne
          </TabButton>
          <TabButton active={activeTab === "equipes"} onClick={() => setActiveTab("equipes")} icon={Users}>
            Classement NXT
          </TabButton>
          <TabButton active={activeTab === "classement"} onClick={() => setActiveTab("classement")} icon={Award}>
            Classement agence
          </TabButton>
          <TabButton active={activeTab === "dpi"} onClick={() => setActiveTab("dpi")} icon={Target}>
            Comparaison DPI
          </TabButton>
        </div>
      </div>

      {/* TAB CONTENT */}
      {activeTab === "interne" && (
        <ComparaisonInternalView conseiller={isIndividualScope ? conseiller : null} />
      )}
      {activeTab === "equipes" && <TeamsComparisonTab />}
      {activeTab === "classement" && <EnrichedLeaderboardTab />}
      {activeTab === "dpi" && <DpiComparisonTab />}
    </>
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
