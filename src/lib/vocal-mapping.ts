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
          contactsTotaux: (d.contactsTotaux as number) ?? 0,
          rdvEstimation: (d.rdvEstimation as number) ?? 0,
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
          acheteursSortisVisite: (d.acheteursSortisVisite as number) ?? 0,
          nombreVisites: (d.nombreVisites as number) ?? 0,
          offresRecues: (d.offresRecues as number) ?? 0,
          compromisSignes: (d.compromisSignes as number) ?? 0,
          chiffreAffairesCompromis: (d.chiffreAffairesCompromis as number) ?? 0,
        };
        break;

      case "ventes":
        result.ventes = {
          actesSignes: (d.actesSignes as number) ?? 0,
          chiffreAffaires: (d.chiffreAffaires as number) ?? 0,
        };
        break;
    }
  }

  return result;
}
