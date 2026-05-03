"use client";

import { useState } from "react";
import { Calendar, Dumbbell, FileText, LineChart, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamActivationKitDrawer } from "./team-activation-kit-drawer";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";
import type { KitKind } from "@/lib/coaching/team-activation-kit";

interface KitCard {
  kind: KitKind;
  icon: typeof Calendar;
  title: string;
  description: string;
}

const CARDS: KitCard[] = [
  {
    kind: "meeting",
    icon: Calendar,
    title: "Réunion équipe",
    description:
      "Trame de brief prête à présenter (objectif, constat, 3 actions, engagement).",
  },
  {
    kind: "practice",
    icon: Dumbbell,
    title: "Mise en pratique",
    description:
      "3 exercices terrain (jeu de rôle, cas réel, reformulation) avec consignes.",
  },
  {
    kind: "weekly",
    icon: LineChart,
    title: "4 points hebdo",
    description:
      "Trame de suivi sur 4 semaines (questions, indicateurs, décision finale).",
  },
];

interface TeamActivationStepsProps {
  /** Levier prioritaire — null = bloc masqué. */
  expertiseId: ExpertiseRatioId | null;
}

/**
 * Bloc "Tout est prêt pour animer votre équipe" (PR3.8.6 follow-up).
 *
 * Remplace l'ancien bloc descriptif "Suivi hebdo / Réunion / Pratique" par
 * 3 kits prêts-à-présenter. Chaque carte ouvre un drawer (drawer unique
 * recyclé, géré localement) avec le contenu généré par
 * `lib/coaching/team-activation-kit`.
 */
export function TeamActivationSteps({ expertiseId }: TeamActivationStepsProps) {
  const [openKind, setOpenKind] = useState<KitKind | null>(null);

  if (!expertiseId) return null;

  const handleOpen = (kind: KitKind) => () => setOpenKind(kind);
  const handleClose = () => setOpenKind(null);

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-1 flex items-center gap-2">
          <PlayCircle className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">
            Tout est prêt pour animer votre équipe
          </h3>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          Vous pouvez modifier, copier ou télécharger chaque support avant de
          le présenter.
        </p>

        <ul className="grid gap-3 sm:grid-cols-3">
          {CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
              <li
                key={card.kind}
                className={cn(
                  "flex flex-col rounded-lg border border-border bg-muted/30 p-4",
                )}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {card.title}
                </p>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                  {card.description}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpen(card.kind)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Ouvrir
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <TeamActivationKitDrawer
        open={openKind !== null}
        onClose={handleClose}
        kind={openKind}
        expertiseId={expertiseId}
      />
    </>
  );
}
