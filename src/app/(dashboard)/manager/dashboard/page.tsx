"use client";

import { useState } from "react";
import {
  Eye,
  LayoutDashboard,
  Link2,
  Target,
  Star,
  Users,
} from "lucide-react";
import { useManagerScope } from "@/hooks/use-manager-scope";
import { useTeamResults } from "@/hooks/team/use-team-results";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { ManagerTeamProductionChainView } from "@/components/manager/dashboard/manager-team-production-chain-view";
import { ManagerTeamDPIView } from "@/components/manager/dashboard/manager-team-dpi-view";
import { ManagerTeamFavorisView } from "@/components/manager/dashboard/manager-team-favoris-view";
import { ConseillerProductionChainView } from "@/components/manager/dashboard/conseiller-production-chain-view";
import { ConseillerDPIView } from "@/components/manager/dashboard/conseiller-dpi-view";
import { ConseillerFavorisView } from "@/components/manager/dashboard/conseiller-favoris-view";

type DashboardTab = "chaine" | "dpi" | "favoris";

export default function ManagerDashboardPage() {
  const {
    conseiller,
    conseillerId,
    teamId,
    isIndividualScope,
    setScope,
  } = useManagerScope();
  const { conseillers } = useTeamResults();
  const isDemo = useAppStore((s) => s.isDemo);
  const [activeTab, setActiveTab] = useState<DashboardTab>("chaine");

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
            Partagez votre code équipe pour inviter vos conseillers. Ils verront
            leur dashboard et vous verrez leurs résultats ici.
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
      {/* ═══ HEADER ═══ */}
      <header className="mx-auto max-w-6xl px-4 pt-8 pb-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <LayoutDashboard className="h-3.5 w-3.5" />
          Mon cockpit
        </div>
        <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Suivez votre chaîne de production, votre DPI et vos indicateurs favoris en
          un coup d&apos;œil.
        </p>
      </header>

      {/* ═══ Bandeau "Vous regardez X" (mode individuel) ═══ */}
      {isIndividualScope && conseiller && (
        <div className="mx-auto max-w-6xl px-4 pb-6">
          <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <Eye className="h-4 w-4 text-primary" />
              <p className="text-sm text-foreground">
                Vous regardez :{" "}
                <strong>
                  {conseiller.firstName} {conseiller.lastName}
                </strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setScope("team")}
              className="text-xs text-primary hover:underline"
            >
              Retour à la vue équipe
            </button>
          </div>
        </div>
      )}

      {/* ═══ TABS ═══ */}
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          <TabButton
            active={activeTab === "chaine"}
            onClick={() => setActiveTab("chaine")}
            icon={Link2}
          >
            Chaîne de production
          </TabButton>
          <TabButton
            active={activeTab === "dpi"}
            onClick={() => setActiveTab("dpi")}
            icon={Target}
          >
            Mon DPI
          </TabButton>
          <TabButton
            active={activeTab === "favoris"}
            onClick={() => setActiveTab("favoris")}
            icon={Star}
          >
            Favoris
          </TabButton>
        </div>
      </div>

      {/* ═══ TAB CONTENT — dispatch selon scope ═══ */}
      {/* Si scope=individual mais aucun conseiller sélectionné : message contextuel */}
      {isIndividualScope && !conseillerId ? (
        <section className="mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Sélectionnez un conseiller dans la barre en haut pour voir sa vue
              détaillée.
            </p>
          </div>
        </section>
      ) : (
        <>
          {activeTab === "chaine" &&
            (isIndividualScope && conseillerId ? (
              <ConseillerProductionChainView userId={conseillerId} />
            ) : (
              <ManagerTeamProductionChainView teamId={teamId} />
            ))}
          {activeTab === "dpi" &&
            (isIndividualScope && conseillerId ? (
              <ConseillerDPIView userId={conseillerId} />
            ) : (
              <ManagerTeamDPIView />
            ))}
          {activeTab === "favoris" &&
            (isIndividualScope && conseillerId ? (
              <ConseillerFavorisView userId={conseillerId} />
            ) : (
              <ManagerTeamFavorisView />
            ))}
        </>
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
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}
