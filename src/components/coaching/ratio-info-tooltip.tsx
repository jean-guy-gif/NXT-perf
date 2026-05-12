"use client";

import { Info } from "lucide-react";
import { Tooltip } from "react-tooltip";
import {
  RATIO_EXPERTISE,
  type ExpertiseRatioId,
} from "@/data/ratio-expertise";
import { RATIO_ID_TO_EXPERTISE_ID } from "@/lib/ratio-to-expertise";
import type { RatioId } from "@/types/ratios";
import { cn } from "@/lib/utils";

/**
 * RatioInfoBadge — sous-PR Coach-24.
 *
 * Petite icone (?) cliquable/hover qui affiche un tooltip micro-learning
 * sur le ratio : formule + 1-2 lignes d'explication issues du corpus
 * NXT-Coach (RATIO_EXPERTISE.diagnosis). Reduit le besoin de naviguer
 * vers /formation pour comprendre un libelle "Estimations -> Mandats".
 *
 * Accepte soit un `ratioId` (les 7 RatioId du store) soit un
 * `expertiseId` (les 8 ExpertiseRatioId du corpus). Le mapping
 * RATIO_ID_TO_EXPERTISE_ID gere la conversion.
 *
 * Provider associe : `<RatioInfoTooltipProvider />` doit etre rendu
 * UNE FOIS dans le layout (dashboard) — il fournit le tooltip cible
 * par `data-tooltip-id="ratio-info-tooltip"`.
 */

interface RatioInfoBadgeProps {
  ratioId?: RatioId;
  expertiseId?: ExpertiseRatioId;
  /** Taille de l'icone (defaut sm = h-3.5 w-3.5). */
  size?: "xs" | "sm" | "md";
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<RatioInfoBadgeProps["size"]>, string> = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildTooltipHtml(expertiseId: ExpertiseRatioId): string {
  const e = RATIO_EXPERTISE[expertiseId];
  if (!e) return "";
  // diagnosis peut etre long — on coupe a 1 phrase. Le contenu detaille
  // reste accessible via /formation. Objectif tooltip : comprendre en 3s.
  const firstSentence = e.diagnosis.split(/\.\s+/)[0] + ".";
  return [
    `<div class="space-y-1 max-w-xs">`,
    `<div class="font-semibold text-foreground">${escapeHtml(e.label)}</div>`,
    `<div class="text-xs"><span class="opacity-70">Formule :</span> ${escapeHtml(e.formula)}</div>`,
    `<div class="text-xs leading-relaxed pt-1">${escapeHtml(firstSentence)}</div>`,
    `</div>`,
  ].join("");
}

export function RatioInfoBadge({
  ratioId,
  expertiseId,
  size = "sm",
  className,
}: RatioInfoBadgeProps) {
  const resolvedId: ExpertiseRatioId | null =
    expertiseId ??
    (ratioId ? RATIO_ID_TO_EXPERTISE_ID[ratioId] : null) ??
    null;

  if (!resolvedId) return null;
  const e = RATIO_EXPERTISE[resolvedId];
  if (!e) return null;

  const html = buildTooltipHtml(resolvedId);

  return (
    <span
      role="img"
      aria-label={`Info sur ${e.label}`}
      data-tooltip-id="ratio-info-tooltip"
      data-tooltip-html={html}
      data-tooltip-place="top"
      className={cn(
        "inline-flex shrink-0 cursor-help items-center text-muted-foreground/70 transition-colors hover:text-primary",
        className,
      )}
    >
      <Info className={SIZE_CLASS[size]} />
    </span>
  );
}

/**
 * Provider tooltip global — a rendre UNE SEULE FOIS dans le layout.
 * Tous les `RatioInfoBadge` du sous-arbre s'attachent automatiquement.
 */
export function RatioInfoTooltipProvider() {
  return (
    <Tooltip
      id="ratio-info-tooltip"
      place="top"
      opacity={1}
      className="!z-50 !max-w-xs !rounded-lg !border !border-border !bg-popover !px-3 !py-2 !text-popover-foreground !shadow-lg"
    />
  );
}
