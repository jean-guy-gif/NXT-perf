import type { RatioConfig, RatioId } from "@/types/ratios";
import type { UserCategory } from "@/types/user";
import type { ObjectiveBreakdown } from "@/types/objectives";

export function calculateObjectiveBreakdown(
  annualCA: number,
  averageActValue: number,
  category: UserCategory,
  ratioConfigs: Record<RatioId, RatioConfig>
): ObjectiveBreakdown {
  const t = (id: RatioId) => ratioConfigs[id].thresholds[category];

  const actesNecessaires = Math.ceil(annualCA / averageActValue);
  const compromisNecessaires = actesNecessaires;
  const offresNecessaires = Math.ceil(
    compromisNecessaires * t("offres_compromis")
  );
  const visitesNecessaires = Math.ceil(offresNecessaires * t("visites_offre"));

  const mandatsExclusifs = Math.ceil(
    actesNecessaires * t("mandats_exclusifs_vente")
  );
  const mandatsSimples = Math.ceil(
    actesNecessaires * t("mandats_simples_vente")
  );
  const mandatsNecessaires = mandatsExclusifs + mandatsSimples;

  const estimationsNecessaires = Math.ceil(
    mandatsNecessaires * t("estimations_mandats")
  );

  const pourcentageExclusivite = t("pct_mandats_exclusifs");

  return {
    estimationsNecessaires,
    mandatsNecessaires,
    pourcentageExclusivite,
    visitesNecessaires,
    offresNecessaires,
    compromisNecessaires,
    actesNecessaires,
  };
}
