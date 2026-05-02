"use client";

import { useEffect, useState } from "react";
import { GraduationCap, ArrowRight, Wallet, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { expertiseToFormationArea } from "@/lib/coaching/coach-brain";
import {
  getFormationsForArea,
  type FormationItem,
} from "@/lib/coaching/training-catalog";
import { formationAreaLabels } from "@/lib/formation";
import { AgeficeWizard } from "@/components/formation/agefice-wizard";
import type { ExpertiseRatioId } from "@/data/ratio-expertise";

interface Props {
  /** Levier recommandé courant — sert à filtrer le catalogue formations */
  expertiseId: ExpertiseRatioId;
}

/**
 * FocusedTrainingBlock — "Se former sur ce point" (PR3.7.6 spec section 4).
 *
 * Formations filtrées via le mapping levier → axe formation :
 *   ExpertiseRatioId → ratioToFormationArea → FormationArea
 *   → getFormationsForArea(area, max=3)
 *
 * Affiche 1-3 cartes simples. Si une formation a `agefice=true`, on affiche
 * un badge + un CTA secondaire "Financer cette formation" qui ouvre le
 * wizard AGEFICE existant.
 *
 * Si aucune formation n'est mappée pour cet axe → composant retourne null
 * (le bloc disparaît plutôt que d'afficher un état vide).
 */
export function FocusedTrainingBlock({ expertiseId }: Props) {
  const [showAgefice, setShowAgefice] = useState(false);
  const [agePreselected, setAgePreselected] = useState<string | null>(null);
  const [previewFormation, setPreviewFormation] = useState<FormationItem | null>(
    null
  );

  const area = expertiseToFormationArea(expertiseId);
  if (!area) return null;

  const formations = getFormationsForArea(area, 3);
  if (formations.length === 0) return null;

  const handleFinancer = (title: string) => {
    setAgePreselected(title);
    setShowAgefice(true);
  };

  const handleStart = (formation: FormationItem) => {
    setPreviewFormation(formation);
  };

  const handleFinancerFromDrawer = (title: string) => {
    setPreviewFormation(null);
    handleFinancer(title);
  };

  // formationOptions reçues par AgeficeWizard = liste des titres
  const formationOptions = formations.map((f) => f.title);
  // Si une préselection existe, on la met en première position pour que le
  // dropdown du wizard l'affiche par défaut.
  const orderedOptions =
    agePreselected && formationOptions.includes(agePreselected)
      ? [agePreselected, ...formationOptions.filter((o) => o !== agePreselected)]
      : formationOptions;

  return (
    <section
      aria-label="Se former sur ce point"
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <GraduationCap className="h-3.5 w-3.5" />
        Me former — {formationAreaLabels[area]}
      </div>
      <h3 className="mt-2 text-lg font-bold text-foreground">
        Renforcer ce levier
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Ces formations peuvent t'aider à accélérer tes résultats.
      </p>

      <ul className="mt-4 space-y-3">
        {formations.map((f) => (
          <FormationCard
            key={f.id}
            item={f}
            onFinancer={handleFinancer}
            onStart={handleStart}
          />
        ))}
      </ul>

      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        className="mt-4 inline-block text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        aria-disabled="true"
        title="Catalogue complet bientôt disponible"
      >
        Voir tout le catalogue →
      </a>

      {showAgefice && (
        <AgeficeWizard
          onClose={() => setShowAgefice(false)}
          formationOptions={orderedOptions}
        />
      )}
    </section>
  );
}

function FormationCard({
  item,
  onFinancer,
  onStart,
}: {
  item: FormationItem;
  onFinancer: (title: string) => void;
  onStart: (formationId: string) => void;
}) {
  return (
    <li className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {item.benefit}
          </p>
          {item.agefice && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">
              <Wallet className="h-2.5 w-2.5" />
              Prise en charge possible (AGEFICE)
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <button
            type="button"
            className={cn(
              "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:border-foreground/20"
            )}
            onClick={() => onStart(item.id)}
          >
            Démarrer
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          {item.agefice && (
            <button
              type="button"
              onClick={() => onFinancer(item.title)}
              className="inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium text-amber-600 underline-offset-2 hover:underline"
            >
              <Wallet className="h-3 w-3" />
              Financer cette formation
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
