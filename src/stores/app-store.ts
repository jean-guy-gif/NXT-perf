import { create } from "zustand";
import type { User, UserRole, OnboardingStatus, ProfileType } from "@/types/user";
import type { PeriodResults } from "@/types/results";
import type { RatioConfig, RatioId } from "@/types/ratios";
import type { DbProfile } from "@/types/database";
import { mockUsers } from "@/data/mock-users";
import { mockResults } from "@/data/mock-results";
import { defaultRatioConfigs } from "@/data/mock-ratios";
import type { CoachAssignment, CoachAction, CoachPlan } from "@/types/coach";
import { mockCoachAssignments, mockCoachActions, mockCoachPlans } from "@/data/mock-coach";
import { generateInstitutionCode, generateTeamCode } from "@/lib/codes";

/** Map user roles to sidebar view IDs */
export type ViewId = "agent" | "manager" | "directeur" | "coach";

export const VIEW_LABELS: Record<ViewId, string> = {
  agent: "Agent",
  manager: "Manager",
  directeur: "Agence",
  coach: "Coach",
};

export function rolesToViews(roles: UserRole[]): ViewId[] {
  const views: ViewId[] = [];
  if (roles.includes("conseiller")) views.push("agent");
  if (roles.includes("manager")) views.push("manager");
  if (roles.includes("directeur")) views.push("directeur");
  if (roles.includes("coach")) views.push("coach");
  return views;
}

export type RemovalReason = "deale" | "abandonne";

export interface RemovedItem {
  id: string;
  nom: string;
  commentaire: string;
  type: "info_vente" | "acheteur_chaud";
  reason: RemovalReason;
  removedAt: string;
}

export interface Institution {
  id: string;
  name: string;
  inviteCode: string;
}

export interface TeamInfo {
  id: string;
  name: string;
  institutionId: string;
  managerId: string;
  inviteCode: string;
}

interface AppState {
  // ── Auth ──
  user: User | null;
  isAuthenticated: boolean;
  isDemo: boolean;
  profile: DbProfile | null;
  orgInviteCode: string | null;

  // ── Data (cache for Supabase, or mock for demo) ──
  users: User[];
  results: PeriodResults[];
  ratioConfigs: Record<RatioId, RatioConfig>;
  removedItems: RemovedItem[];

  // ── Onboarding (demo mode) ──
  institutions: Institution[];
  teamInfos: TeamInfo[];

  // ── Coach ──
  coachAssignments: CoachAssignment[];
  coachActions: CoachAction[];
  coachPlans: CoachPlan[];

  // ── View toggles ──
  activeViews: ViewId[];
  toggleView: (view: ViewId) => void;

  // ── Demo mode ──
  enterDemo: () => void;
  exitDemo: () => void;

  // ── Auth actions (used in demo mode only) ──
  login: (email: string, password: string) => "success" | "not_found" | "wrong_password";
  logout: () => void;
  register: (user: User) => void;
  updateUserPassword: (email: string, newPassword: string) => boolean;

  // ── Supabase auth ──
  setProfile: (profile: DbProfile | null) => void;
  setAuthenticated: (authed: boolean) => void;
  setOrgInviteCode: (code: string | null) => void;

  // ── Data actions (used in both modes) ──
  setUser: (user: User) => void;
  switchRole: () => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  assignAgent: (agentId: string, managerId: string) => void;
  unassignAgent: (agentId: string) => void;
  addResults: (result: PeriodResults) => void;
  setResults: (results: PeriodResults[]) => void;
  updateInfoVenteStatut: (resultId: string, itemId: string, statut: "deale" | "abandonne") => void;
  updateAcheteurChaudStatut: (resultId: string, itemId: string, statut: "deale" | "abandonne") => void;
  setRatioConfigs: (configs: Record<RatioId, RatioConfig>) => void;
  updateRatioThreshold: (
    ratioId: RatioId,
    level: "debutant" | "confirme" | "expert",
    value: number
  ) => void;
  resetRatioConfigs: () => void;

  // ── Onboarding actions ──
  createInstitution: (name: string) => { agCode: string; mgCode: string; institutionId: string; teamId: string };
  joinInstitution: (code: string) => { mgCode: string; teamId: string } | null;
  joinTeam: (code: string) => boolean;
  createPersonalTeam: () => void;
  completeOnboarding: (profileType: ProfileType) => void;
  setOnboardingStatus: (status: OnboardingStatus) => void;

  // ── Coach actions ──
  addCoachAction: (action: CoachAction) => void;
  toggleCoachAction: (id: string) => void;
  removeCoachAction: (id: string) => void;
  createCoachPlan: (plan: CoachPlan) => void;
  completeCoachPlan: (id: string) => void;
  cancelCoachPlan: (id: string) => void;
  revokeCoachAssignment: (assignmentId: string) => void;
  updateExcludedManagers: (assignmentId: string, managerIds: string[]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isDemo: false,
  profile: null,
  orgInviteCode: null,
  users: [],
  results: [],
  ratioConfigs: JSON.parse(JSON.stringify(defaultRatioConfigs)),
  removedItems: [],
  institutions: [],
  teamInfos: [],
  coachAssignments: [],
  coachActions: [],
  coachPlans: [],
  activeViews: [],

  // ── View toggles ──
  toggleView: (view) => {
    set((s) => {
      if (s.activeViews.includes(view)) {
        if (s.activeViews.length <= 1) return s;
        return { activeViews: s.activeViews.filter((v) => v !== view) };
      }
      return { activeViews: [...s.activeViews, view] };
    });
  },

  // ── Demo mode ──
  enterDemo: () => {
    const demoUser = { ...mockUsers[0], onboardingStatus: "DONE" as const };
    document.cookie = "nxt-demo-mode=true;path=/;max-age=86400";
    set({
      isDemo: true,
      isAuthenticated: true,
      user: demoUser,
      users: mockUsers.map((u) => ({ ...u, onboardingStatus: "DONE" as const })),
      results: mockResults,
      ratioConfigs: JSON.parse(JSON.stringify(defaultRatioConfigs)),
      coachAssignments: mockCoachAssignments,
      coachActions: mockCoachActions,
      coachPlans: mockCoachPlans,
      activeViews: rolesToViews(demoUser.availableRoles),
    });
  },

  exitDemo: () => {
    document.cookie = "nxt-demo-mode=;path=/;max-age=0";
    set({
      isDemo: false,
      isAuthenticated: false,
      user: null,
      users: [],
      results: [],
      ratioConfigs: JSON.parse(JSON.stringify(defaultRatioConfigs)),
      removedItems: [],
      institutions: [],
      teamInfos: [],
      activeViews: [],
    });
  },

  // ── Auth (demo mode only — Supabase mode uses supabase.auth directly) ──
  login: (email, password) => {
    const found = get().users.find((u) => u.email === email);
    if (!found) return "not_found";
    if (found.password && found.password !== password) return "wrong_password";
    set({ user: found, isAuthenticated: true, activeViews: rolesToViews(found.availableRoles) });
    return "success";
  },

  logout: () => {
    const isDemo = get().isDemo;
    if (isDemo) {
      get().exitDemo();
    } else {
      set({ user: null, isAuthenticated: false, profile: null, orgInviteCode: null, activeViews: [] });
    }
  },

  register: (user) => {
    set((state) => ({
      users: [...state.users, user],
      user,
      isAuthenticated: true,
    }));
  },

  updateUserPassword: (email, newPassword) => {
    const found = get().users.find((u) => u.email === email);
    if (!found) return false;
    set((state) => ({
      users: state.users.map((u) =>
        u.email === email ? { ...u, password: newPassword } : u
      ),
    }));
    return true;
  },

  // ── Supabase auth ──
  setProfile: (profile) => {
    if (profile) {
      const role = profile.role;
      // Derive availableRoles from DB: use available_roles if present, else [role]
      const rawAvailable = (profile as DbProfile & { available_roles?: string[] }).available_roles;
      const availableRoles: import("@/types/user").UserRole[] = Array.isArray(rawAvailable)
        ? rawAvailable as import("@/types/user").UserRole[]
        : [role];
      const user: User = {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        role,
        availableRoles,
        category: profile.category,
        teamId: profile.team_id ?? "",
        avatarUrl: profile.avatar_url ?? undefined,
        createdAt: profile.created_at,
        onboardingStatus: (profile.onboarding_status as OnboardingStatus) ?? "NOT_STARTED",
        profileType: (profile.profile_type as ProfileType) ?? undefined,
        institutionId: profile.org_id ?? undefined,
      };
      set({ profile, user, isAuthenticated: true, activeViews: rolesToViews(availableRoles) });
    } else {
      set({ profile: null, user: null, isAuthenticated: false, activeViews: [] });
    }
  },

  setAuthenticated: (authed) => set({ isAuthenticated: authed }),

  setOrgInviteCode: (code) => set({ orgInviteCode: code }),

  // ── Data actions ──
  setUser: (user) => set({ user }),

  switchRole: () => {
    const current = get().user;
    if (!current) return;
    if (current.role === "coach") return; // Coach cannot switch roles
    const users = get().users;

    if (current.role === "directeur") {
      // Directeur → Manager: same person, just change role
      set({ user: { ...current, role: "manager" } });
    } else if (current.role === "manager") {
      // Check if this user is the directeur who switched down
      const directeur = users.find((u) => u.role === "directeur");
      if (directeur && directeur.id === current.id) {
        // Manager → Directeur: switch back up
        set({ user: { ...current, role: "directeur" } });
      } else {
        // Regular manager → conseiller (existing behavior)
        const conseiller = users.find((u) => u.role === "conseiller");
        if (conseiller) set({ user: conseiller });
      }
    } else {
      // Conseiller → Manager (existing behavior)
      const manager = users.find((u) => u.role === "manager");
      if (manager) set({ user: manager });
    }
  },

  addUser: (user) => {
    set((state) => {
      // Idempotent: skip if user with same id already exists
      if (state.users.some((u) => u.id === user.id)) return state;
      return { users: [...state.users, user] };
    });
  },

  removeUser: (userId) => {
    set((state) => ({
      users: state.users.filter((u) => u.id !== userId),
      results: state.results.filter((r) => r.userId !== userId),
    }));
  },

  assignAgent: (agentId, managerId) => {
    const manager = get().users.find((u) => u.id === managerId);
    if (!manager) return;
    set((state) => ({
      users: state.users.map((u) =>
        u.id === agentId ? { ...u, managerId, teamId: manager.teamId } : u
      ),
    }));
  },

  unassignAgent: (agentId) => {
    set((state) => ({
      users: state.users.map((u) =>
        u.id === agentId ? { ...u, managerId: undefined } : u
      ),
    }));
  },

  addResults: (result) => {
    set((state) => ({
      results: [...state.results.filter((r) => r.id !== result.id), result],
    }));
  },

  setResults: (results) => set({ results }),

  updateInfoVenteStatut: (resultId, itemId, statut) => {
    set((state) => ({
      results: state.results.map((r) =>
        r.id === resultId
          ? {
              ...r,
              prospection: {
                ...r.prospection,
                informationsVente: r.prospection.informationsVente.map((i) =>
                  i.id === itemId ? { ...i, statut } : i
                ),
              },
            }
          : r
      ),
    }));
  },

  updateAcheteurChaudStatut: (resultId, itemId, statut) => {
    set((state) => ({
      results: state.results.map((r) =>
        r.id === resultId
          ? {
              ...r,
              acheteurs: {
                ...r.acheteurs,
                acheteursChauds: r.acheteurs.acheteursChauds.map((i) =>
                  i.id === itemId ? { ...i, statut } : i
                ),
              },
            }
          : r
      ),
    }));
  },

  setRatioConfigs: (configs) => set({ ratioConfigs: configs }),

  updateRatioThreshold: (ratioId, level, value) => {
    set((state) => ({
      ratioConfigs: {
        ...state.ratioConfigs,
        [ratioId]: {
          ...state.ratioConfigs[ratioId],
          thresholds: {
            ...state.ratioConfigs[ratioId].thresholds,
            [level]: value,
          },
        },
      },
    }));
  },

  resetRatioConfigs: () => {
    set({ ratioConfigs: JSON.parse(JSON.stringify(defaultRatioConfigs)) });
  },

  // ── Onboarding actions ──

  createInstitution: (name) => {
    const state = get();
    const existingAgCodes = new Set(state.institutions.map((i) => i.inviteCode));
    const existingMgCodes = new Set(state.teamInfos.map((t) => t.inviteCode));

    const agCode = generateInstitutionCode(existingAgCodes);
    const institutionId = `org-${Date.now()}`;
    const teamId = `team-${Date.now()}`;
    const mgCode = generateTeamCode(existingMgCodes);

    const institution: Institution = { id: institutionId, name, inviteCode: agCode };
    const teamInfo: TeamInfo = {
      id: teamId,
      name: `Équipe de ${state.user?.firstName ?? "Manager"}`,
      institutionId,
      managerId: state.user?.id ?? "",
      inviteCode: mgCode,
    };

    set((s) => ({
      institutions: [...s.institutions, institution],
      teamInfos: [...s.teamInfos, teamInfo],
      orgInviteCode: agCode,
      user: s.user
        ? { ...s.user, role: "manager", teamId, institutionId }
        : s.user,
    }));

    return { agCode, mgCode, institutionId, teamId };
  },

  joinInstitution: (code) => {
    const state = get();
    const institution = state.institutions.find((i) => i.inviteCode === code.trim());
    if (!institution) return null;

    const existingMgCodes = new Set(state.teamInfos.map((t) => t.inviteCode));
    const mgCode = generateTeamCode(existingMgCodes);
    const teamId = `team-${Date.now()}`;

    const teamInfo: TeamInfo = {
      id: teamId,
      name: `Équipe de ${state.user?.firstName ?? "Manager"}`,
      institutionId: institution.id,
      managerId: state.user?.id ?? "",
      inviteCode: mgCode,
    };

    set((s) => ({
      teamInfos: [...s.teamInfos, teamInfo],
      orgInviteCode: code.trim(),
      user: s.user
        ? { ...s.user, role: "manager", teamId, institutionId: institution.id }
        : s.user,
    }));

    return { mgCode, teamId };
  },

  joinTeam: (code) => {
    const state = get();
    const teamInfo = state.teamInfos.find((t) => t.inviteCode === code.trim());
    if (!teamInfo) return false;

    set((s) => ({
      user: s.user
        ? {
            ...s.user,
            role: "conseiller",
            teamId: teamInfo.id,
            managerId: teamInfo.managerId,
            institutionId: teamInfo.institutionId,
          }
        : s.user,
    }));

    return true;
  },

  createPersonalTeam: () => {
    const state = get();
    const teamId = `team-solo-${Date.now()}`;

    set((s) => ({
      user: s.user ? { ...s.user, teamId } : s.user,
    }));
  },

  completeOnboarding: (profileType) => {
    set((s) => ({
      user: s.user
        ? { ...s.user, onboardingStatus: "DONE", profileType }
        : s.user,
    }));
  },

  setOnboardingStatus: (status) => {
    set((s) => ({
      user: s.user ? { ...s.user, onboardingStatus: status } : s.user,
    }));
  },

  // ── Coach actions ──

  addCoachAction: (action) =>
    set((s) => ({ coachActions: [...s.coachActions, action] })),

  toggleCoachAction: (id) =>
    set((s) => ({
      coachActions: s.coachActions.map((a) =>
        a.id === id ? { ...a, status: a.status === "TODO" ? "DONE" as const : "TODO" as const } : a
      ),
    })),

  removeCoachAction: (id) =>
    set((s) => ({
      coachActions: s.coachActions.filter((a) => a.id !== id),
    })),

  createCoachPlan: (plan) =>
    set((s) => ({ coachPlans: [...s.coachPlans, plan] })),

  completeCoachPlan: (id) =>
    set((s) => ({
      coachPlans: s.coachPlans.map((p) =>
        p.id === id ? { ...p, status: "COMPLETED" as const } : p
      ),
    })),

  cancelCoachPlan: (id) =>
    set((s) => ({
      coachPlans: s.coachPlans.map((p) =>
        p.id === id ? { ...p, status: "CANCELLED" as const } : p
      ),
    })),

  revokeCoachAssignment: (assignmentId) =>
    set((s) => ({
      coachAssignments: s.coachAssignments.map((a) =>
        a.id === assignmentId ? { ...a, status: "REVOKED" as const } : a
      ),
    })),

  updateExcludedManagers: (assignmentId, managerIds) =>
    set((s) => ({
      coachAssignments: s.coachAssignments.map((a) =>
        a.id === assignmentId ? { ...a, excludedManagerIds: managerIds } : a
      ),
    })),
}));
