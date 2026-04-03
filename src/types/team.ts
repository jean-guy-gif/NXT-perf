import type { User } from "./user";
import type { ComputedRatio } from "./ratios";

export interface TeamMember extends User {
  computedRatios: ComputedRatio[];
  chiffreAffaires: number;
  actesSignes: number;
}

export interface TeamAlert {
  id: string;
  type: "danger" | "warning";
  message: string;
  relatedUserId?: string;
  relatedRatioId?: string;
}

export interface TeamStats {
  teamId: string;
  totalCA: number;
  totalActes: number;
  avgExclusivite: number;
  avgPerformance: number;
  alerts: TeamAlert[];
  members: TeamMember[];
}

export interface RankingEntry {
  userId: string;
  userName: string;
  avatarUrl?: string;
  value: number;
  rank: number;
}

export type RankingMetric =
  | "estimations"
  | "mandats"
  | "visites"
  | "offres"
  | "compromis"
  | "actes"
  | "ca";
