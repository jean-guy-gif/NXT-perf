/**
 * Mini-catalogue formations par axe métier (FormationArea).
 *
 * Source unique pour le bloc "Se former sur ce point" affiché sur
 * /conseiller/ameliorer (FocusedTrainingBlock).
 *
 * Règles :
 *   - 1 à 3 formations max par axe
 *   - Format simple : titre + bénéfice (1 phrase) + flag AGEFICE
 *   - Pas de pricing, pas de durée affichée par défaut (à enrichir post-MVP
 *     quand le vrai catalogue formation sera connecté)
 *   - Si flag agefice=true → badge "Prise en charge possible (AGEFICE)" + CTA
 *     secondaire "Financer cette formation" dans l'UI
 *
 * Tout changement de cette liste doit être validé côté métier — c'est ce
 * que voit le conseiller comme alternative au plan 30j (modalité "Me former").
 */

import type { FormationArea } from "@/types/formation";

export interface FormationItem {
  /** Identifiant stable, utilisable comme key React */
  id: string;
  title: string;
  benefit: string;
  /** Si true, formation finançable via wizard AGEFICE */
  agefice: boolean;
  /** Lien externe ou ancre future. V1 : null = bouton "Démarrer" placeholder */
  href?: string | null;
}

export const TRAINING_CATALOG: Record<FormationArea, FormationItem[]> = {
  prospection: [
    {
      id: "prosp-1",
      title: "Prospection terrain efficace",
      benefit:
        "Construire un discours rodé et un parcours de relance qui transforme.",
      agefice: true,
    },
    {
      id: "prosp-2",
      title: "Prospection téléphonique",
      benefit: "Décrocher 2 fois plus de RDV estimation à volume égal.",
      agefice: true,
    },
    {
      id: "prosp-3",
      title: "Prospection digitale ciblée",
      benefit: "Aligner réseau social, base de données et relance automatisée.",
      agefice: false,
    },
  ],

  estimation: [
    {
      id: "estim-1",
      title: "Estimation & prise de mandat",
      benefit:
        "Process R1/R2 hyper rodé qui termine sur la signature du mandat.",
      agefice: true,
    },
    {
      id: "estim-2",
      title: "Argumentation prix",
      benefit:
        "Défendre une estimation cohérente face aux objections du vendeur.",
      agefice: true,
    },
  ],

  exclusivite: [
    {
      id: "exclu-1",
      title: "Vendre l'exclusivité",
      benefit:
        "Différencier services mandat simple vs exclusif et signer +30% d'exclus.",
      agefice: true,
    },
    {
      id: "exclu-2",
      title: "Convertir un mandat simple en exclu",
      benefit:
        "Méthode de requalification au RDV de suivi, sans repartir à zéro.",
      agefice: false,
    },
  ],

  suivi_mandat: [
    {
      id: "suivi-1",
      title: "Pilotage de portefeuille mandat",
      benefit:
        "Reporting vendeur, ajustement de prix, relances structurées.",
      agefice: true,
    },
  ],

  accompagnement_acheteur: [
    {
      id: "acq-1",
      title: "Découverte acheteur",
      benefit:
        "Filtrer les clients, qualifier le projet, signer un mandat de recherche.",
      agefice: true,
    },
    {
      id: "acq-2",
      title: "Visites par contraste",
      benefit:
        "3 biens par sortie (repoussoir, ciblé, confort) — closing accéléré.",
      agefice: true,
    },
  ],

  negociation: [
    {
      id: "nego-1",
      title: "Closing offre & négociation face-to-face",
      benefit:
        "Aiguiller l'acheteur AVANT de transmettre l'offre, négocier en direct.",
      agefice: true,
    },
    {
      id: "nego-2",
      title: "Sécuriser le compromis jusqu'à l'acte",
      benefit:
        "Vérifier le financement, suivre les conditions suspensives, ne plus casser.",
      agefice: true,
    },
  ],
};

/**
 * Retourne les formations pertinentes pour un axe (max N items).
 */
export function getFormationsForArea(
  area: FormationArea,
  max: number = 3
): FormationItem[] {
  return (TRAINING_CATALOG[area] ?? []).slice(0, max);
}
