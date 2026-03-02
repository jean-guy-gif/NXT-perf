import type { ProfileType } from "./user";

export type OnboardingStep =
  | "PROFILE_TYPE"
  | "INSTITUTION_NAME"
  | "INSTITUTION_CONFIRM"
  | "INSTITUTION_SUCCESS"
  | "MANAGER_JOIN"
  | "MANAGER_SUCCESS"
  | "AGENT_JOIN"
  | "AGENT_SUCCESS"
  | "COACH_DONE";

export interface OnboardingState {
  profileType: ProfileType | null;
  currentStep: OnboardingStep;
  institutionName?: string;
  agCode?: string;
  mgCode?: string;
  joinCode?: string;
  institutionId?: string;
  teamId?: string;
}

export const initialOnboardingState: OnboardingState = {
  profileType: null,
  currentStep: "PROFILE_TYPE",
};
