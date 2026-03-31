import type { PeriodResults } from "@/types/results";
import type { SectionResult } from "@/hooks/use-vocal-flow";

export function mapVocalToResults(
  vocalResults: SectionResult[]
): Partial<PeriodResults> {
  const result: Partial<PeriodResults> = {};

  for (const sr of vocalResults) {
    if (sr.allNull) continue;

    const d = sr.extracted;

    switch (sr.section) {
      case "prospection":
        result.prospection = {
          contactsEntrants: (d.contactsEntrants as number) ?? 0,
          contactsTotaux: (d.contactsTotaux as number) ?? 0,
          rdvEstimation: (d.rdvEstimation as number) ?? 0,
          informationsVente: (
            (d.informationsVente as Array<{ nom: string; commentaire: string }>) ?? []
          ).map((iv, i) => ({
            id: `iv-vocal-${i}`,
            nom: iv.nom,
            commentaire: iv.commentaire,
            statut: "en_cours" as const,
          })),
        };
        break;

      case "vendeurs":
        result.vendeurs = {
          rdvEstimation: (d.estimationsRealisees as number) ?? 0,
          estimationsRealisees: (d.estimationsRealisees as number) ?? 0,
          mandatsSignes: (d.mandatsSignes as number) ?? 0,
          mandats: (
            (d.mandats as Array<{ nomVendeur: string; type: string }>) ?? []
          ).map((m, i) => ({
            id: `m-vocal-${i}`,
            nomVendeur: m.nomVendeur,
            type: m.type as "simple" | "exclusif",
          })),
          rdvSuivi: (d.rdvSuivi as number) ?? 0,
          requalificationSimpleExclusif:
            (d.requalificationSimpleExclusif as number) ?? 0,
          baissePrix: (d.baissePrix as number) ?? 0,
        };
        break;

      case "acheteurs":
        result.acheteurs = {
          acheteursChauds: (
            (d.acheteursChauds as Array<{ nom: string; commentaire: string }>) ?? []
          ).map((ac, i) => ({
            id: `ac-vocal-${i}`,
            nom: ac.nom,
            commentaire: ac.commentaire,
            statut: "en_cours" as const,
          })),
          acheteursSortisVisite: (d.acheteursSortisVisite as number) ?? 0,
          nombreVisites: (d.nombreVisites as number) ?? 0,
          offresRecues: (d.offresRecues as number) ?? 0,
          compromisSignes: (d.compromisSignes as number) ?? 0,
        };
        break;

      case "ventes":
        result.ventes = {
          actesSignes: (d.actesSignes as number) ?? 0,
          chiffreAffaires: (d.chiffreAffaires as number) ?? 0,
          delaiMoyenVente: (d.delaiMoyenVente as number) ?? 0,
        };
        break;
    }
  }

  return result;
}
