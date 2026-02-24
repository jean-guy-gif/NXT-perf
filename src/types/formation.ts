export type FormationArea =
  | "prospection"
  | "estimation"
  | "exclusivite"
  | "suivi_mandat"
  | "accompagnement_acheteur"
  | "negociation";

export type Priority = 1 | 2 | 3;

export interface FormationRecommendation {
  area: FormationArea;
  label: string;
  priority: Priority;
  currentRatio: number;
  targetRatio: number;
  gapPercentage: number;
  description: string;
}

export interface FormationDiagnostic {
  userId: string;
  generatedAt: string;
  overallStatus: "ok" | "warning" | "danger";
  recommendations: FormationRecommendation[];
}
