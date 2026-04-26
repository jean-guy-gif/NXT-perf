// MOCK — à raccorder via API NXT Training plus tard
// Ces données sont statiques et ne reflètent pas une vraie activité.
// Affichées sous bandeau "Aperçu mocké" pour transparence utilisateur.

export interface NxtTrainingConseillerSummary {
  name: string;
  formationsCount: number;
  hours: number;
  lastConnection: string; // ISO date
}

export interface NxtTrainingTeamData {
  totalFormationsThisMonth: number;
  totalHoursCumulated: number;
  perConseillerSummary: NxtTrainingConseillerSummary[];
}

export const mockTeamNxtTrainingData: NxtTrainingTeamData = {
  totalFormationsThisMonth: 12,
  totalHoursCumulated: 36,
  perConseillerSummary: [
    { name: "Alice Martin", formationsCount: 5, hours: 14, lastConnection: "2026-04-25" },
    { name: "Bruno Dupont", formationsCount: 3, hours: 8, lastConnection: "2026-04-23" },
    { name: "Camille Leroy", formationsCount: 2, hours: 6, lastConnection: "2026-04-21" },
    { name: "David Bernard", formationsCount: 2, hours: 5, lastConnection: "2026-04-18" },
    { name: "Emma Petit", formationsCount: 0, hours: 0, lastConnection: "2026-04-10" },
  ],
};

export interface NxtTrainingFormation {
  title: string;
  date: string; // ISO
  status: "done" | "in_progress";
  durationHours: number;
}

export interface NxtTrainingIndividualData {
  formations: NxtTrainingFormation[];
  totalSessions: number;
  totalHours: number;
}

export function getMockIndividualNxtTraining(_conseillerName: string): NxtTrainingIndividualData {
  // Données identiques pour tous les conseillers — démo visuelle.
  // En prod, l'API NXT Training filtrera par identifiant conseiller.
  return {
    formations: [
      {
        title: "Prospection téléphonique — qualification leads entrants",
        date: "2026-04-24",
        status: "done",
        durationHours: 1.5,
      },
      {
        title: "Argumentation prix face au vendeur",
        date: "2026-04-20",
        status: "done",
        durationHours: 2,
      },
      {
        title: "Closing : techniques de gestion d'objection",
        date: "2026-04-15",
        status: "in_progress",
        durationHours: 1,
      },
      {
        title: "Préparation visite acheteur — qualification besoin",
        date: "2026-04-08",
        status: "done",
        durationHours: 1.5,
      },
    ],
    totalSessions: 4,
    totalHours: 6,
  };
}
