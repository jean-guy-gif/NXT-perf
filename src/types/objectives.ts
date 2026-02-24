export interface ObjectiveInput {
  objectifFinancierAnnuel: number;
}

export interface ObjectiveBreakdown {
  estimationsNecessaires: number;
  mandatsNecessaires: number;
  pourcentageExclusivite: number;
  visitesNecessaires: number;
  offresNecessaires: number;
  compromisNecessaires: number;
  actesNecessaires: number;
}

export interface Objective {
  id: string;
  userId: string;
  year: number;
  input: ObjectiveInput;
  breakdown: ObjectiveBreakdown;
  progress: Partial<ObjectiveBreakdown>;
}
