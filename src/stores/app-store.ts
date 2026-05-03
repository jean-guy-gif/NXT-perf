import { create } from "zustand";
import type { User, UserRole, OnboardingStatus, ProfileType } from "@/types/user";
import type { PeriodResults } from "@/types/results";
import type { RatioConfig, RatioId } from "@/types/ratios";
import type { DbProfile } from "@/types/database";
import { mockUsers } from "@/data/mock-users";
import { mockResults, mockJanuaryResults } from "@/data/mock-results";
import { defaultRatioConfigs } from "@/data/mock-ratios";
import type { FinancialData, FinancialFieldId } from "@/types/finance";
import { getMonthKey } from "@/lib/finance-trajectory";
import { mockFinancialData } from "@/data/mock-finance";
import { generateInstitutionCode, generateTeamCode } from "@/lib/codes";
import { mockNetworkUsers, mockNetworkResults, mockNetworkJanuaryResults, mockNetworkInstitutions, mockNetworks, mockReseauUser, type Network } from "@/data/mock-network";

/** Map user roles to sidebar view IDs */
export type ViewId = "agent" | "manager" | "directeur" | "reseau";

export const VIEW_LABELS: Record<ViewId, string> = {
  agent: "Conseiller",
  manager: "Manager",
  directeur: "Agence",
  reseau: "Réseau",
};

export function rolesToViews(roles: UserRole[]): ViewId[] {
  const views: ViewId[] = [];
  if (roles.includes("conseiller")) views.push("agent");
  if (roles.includes("manager")) views.push("manager");
  if (roles.includes("directeur")) views.push("directeur");
  if (roles.includes("reseau")) views.push("reseau");
  return views;
}

/** Route par défaut pour chaque rôle */
export const DEFAULT_ROUTES: Record<UserRole, string> = {
  conseiller: "/conseiller/diagnostic",
  manager: "/manager/diagnostic",
  directeur: "/directeur/pilotage",
  reseau: "/reseau/dashboard",
};

/** Compute visible views: authorizedViews minus user-hidden preferences */
export function getVisibleViews(availableRoles: UserRole[], hiddenViews: ViewId[]): ViewId[] {
  const authorized = rolesToViews(availableRoles);
  return authorized.filter((v) => !hiddenViews.includes(v));
}

/**
 * Return the user's role as a strict single-entry array.
 * Multi-role users must have their available_roles explicitly set in DB
 * via `selected_roles` at signup (Philosophy B — no implicit hierarchy).
 */
export function deriveAvailableRoles(role: UserRole): UserRole[] {
  return [role];
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

export interface DirectorCosts {
  commissionDirecteur: number;
  commissionManagers: number;
  commissionConseillers: number;
  coutsFixes: number;
  masseSalariale: number;
  autresCharges: number;
}

interface AppState {
  // ── Auth ──
  user: User | null;
  isAuthenticated: boolean;
  isDemo: boolean;
  isDemoMode: boolean;
  profile: DbProfile | null;
  orgInviteCode: string | null;
  orgLogoUrl: string | null;

  // ── Data (cache for Supabase, or mock for demo) ──
  users: User[];
  results: PeriodResults[];
  ratioConfigs: Record<RatioId, RatioConfig>;

  // ── Onboarding (demo mode) ──
  institutions: Institution[];
  teamInfos: TeamInfo[];
  networks: Network[];

  // ── Director inputs (persisted in localStorage) ──
  agencyObjective: { annualCA: number; avgActValue: number } | null;
  directorCosts: DirectorCosts | null;
  financialData: Partial<FinancialData>;
  /** Snapshots mensuels des saisies financières (PR2i) — keyed par YYYY-MM. */
  financialDataHistory: Record<string, Partial<FinancialData>>;

  // ── Outils NXT actifs (souscrits par l'utilisateur) ──
  activeTools: Array<"nxt_data" | "nxt_profiling" | "nxt_training" | "nxt_finance">;
  activateTool: (tool: "nxt_data" | "nxt_profiling" | "nxt_training" | "nxt_finance") => void;
  deactivateTool: (tool: "nxt_data" | "nxt_profiling" | "nxt_training" | "nxt_finance") => void;

  setAgencyObjective: (obj: { annualCA: number; avgActValue: number } | null) => void;
  setDirectorCosts: (costs: DirectorCosts | null) => void;
  setFinancialData: (data: Partial<FinancialData>) => void;
  updateFinancialField: (field: FinancialFieldId, value: number) => void;
  /** Sync silencieuse de caTransaction avec la valeur agrégée agence (PR2i Q4).
   *  Ne touche PAS isCaTransactionManuallyOverridden (utilisé par useEffect auto-sync). */
  setCaTransactionFromAgency: (value: number) => void;
  /** Resync utilisateur : flag à false pour réactiver l'auto-sync agence (PR2i Q4). */
  clearCaTransactionOverride: () => void;
  /** Restaure la dernière saisie mensuelle disponible (< mois courant) — PR2i Q1. */
  restorePreviousMonth: () => void;

  // ── View preferences (hiddenViews = user hides a view, never adds permissions) ──
  hiddenViews: ViewId[];
  toggleViewVisibility: (view: ViewId) => void;

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
  setOrgLogoUrl: (url: string | null) => void;

  // ── Data actions (used in both modes) ──
  setUser: (user: User) => void;
  /** Permission-checked role switch — returns redirect path, or null if denied/no-op */
  switchRole: (targetRole: UserRole) => string | null;
  /** Demo only — switches to a different mock user for testing */
  switchDemoUser: () => void;
  addUser: (user: User) => void;
  setUsers: (users: User[]) => void;
  removeUser: (userId: string) => void;
  assignAgent: (agentId: string, managerId: string) => void;
  unassignAgent: (agentId: string) => void;
  addResults: (result: PeriodResults) => void;
  setResults: (results: PeriodResults[]) => void;
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

}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isDemo: false,
  isDemoMode: false,
  profile: null,
  orgInviteCode: null,
  orgLogoUrl: null,
  users: [],
  results: [],
  ratioConfigs: JSON.parse(JSON.stringify(defaultRatioConfigs)),
  institutions: [],
  teamInfos: [],
  networks: [],
  hiddenViews: [],
  agencyObjective: null,
  directorCosts: null,
  financialData: {},
  financialDataHistory: {},
  activeTools: [],

  // ── View preferences ──
  toggleViewVisibility: (view) => {
    set((s) => {
      const authorized = rolesToViews(s.user?.availableRoles ?? []);
      if (!authorized.includes(view)) return s; // Can't toggle a view you don't have
      if (s.hiddenViews.includes(view)) {
        // Un-hide
        return { hiddenViews: s.hiddenViews.filter((v) => v !== view) };
      }
      // Hide — but don't allow hiding ALL views
      const wouldBeVisible = authorized.filter((v) => !s.hiddenViews.includes(v) && v !== view);
      if (wouldBeVisible.length === 0) return s;
      return { hiddenViews: [...s.hiddenViews, view] };
    });
  },

  setAgencyObjective: (obj) => set({ agencyObjective: obj }),
  setDirectorCosts: (costs) => set({ directorCosts: costs }),
  setFinancialData: (data) => set({ financialData: data }),
  updateFinancialField: (field, value) => set((s) => {
    // PR2i — édition utilisateur d'un champ financier :
    // - Pour caTransaction : on lève le flag override (l'utilisateur prend la main).
    // - Pour tous les champs : on snapshot l'état dans l'historique du mois courant.
    const newFinancial: Partial<FinancialData> = {
      ...s.financialData,
      [field]: value,
    };
    if (field === "caTransaction") {
      newFinancial.isCaTransactionManuallyOverridden = true;
    }
    const monthKey = getMonthKey();
    return {
      financialData: newFinancial,
      financialDataHistory: {
        ...s.financialDataHistory,
        [monthKey]: newFinancial,
      },
    };
  }),
  setCaTransactionFromAgency: (value) => set((s) => {
    // Sync silencieuse — ne lève PAS le flag override (utilisé par useEffect auto-sync).
    if (s.financialData.isCaTransactionManuallyOverridden) return s;
    if (s.financialData.caTransaction === value) return s;
    const newFinancial: Partial<FinancialData> = {
      ...s.financialData,
      caTransaction: value,
    };
    const monthKey = getMonthKey();
    return {
      financialData: newFinancial,
      financialDataHistory: {
        ...s.financialDataHistory,
        [monthKey]: newFinancial,
      },
    };
  }),
  clearCaTransactionOverride: () => set((s) => {
    if (!s.financialData.isCaTransactionManuallyOverridden) return s;
    const newFinancial: Partial<FinancialData> = {
      ...s.financialData,
      isCaTransactionManuallyOverridden: false,
    };
    const monthKey = getMonthKey();
    return {
      financialData: newFinancial,
      financialDataHistory: {
        ...s.financialDataHistory,
        [monthKey]: newFinancial,
      },
    };
  }),
  restorePreviousMonth: () => set((s) => {
    // Trouve la clé YYYY-MM la plus récente strictement < mois courant.
    const currentKey = getMonthKey();
    const previousKey = Object.keys(s.financialDataHistory)
      .filter((k) => k < currentKey)
      .sort()
      .pop();
    if (!previousKey) return s;
    const previous = s.financialDataHistory[previousKey];
    if (!previous) return s;
    return { financialData: { ...previous } };
  }),

  activateTool: (tool) => set((s) => ({
    activeTools: s.activeTools.includes(tool) ? s.activeTools : [...s.activeTools, tool],
  })),
  deactivateTool: (tool) => set((s) => ({
    activeTools: s.activeTools.filter((t) => t !== tool),
  })),

  // ── Demo mode ──
  enterDemo: () => {
    const demoUser = { ...mockUsers[0], onboardingStatus: "DONE" as const };
    document.cookie = "nxt-demo-mode=true;path=/;max-age=86400";
    set({
      isDemo: true,
      isDemoMode: true,
      isAuthenticated: true,
      user: demoUser,
      users: [
        ...mockUsers.map((u) => ({ ...u, onboardingStatus: "DONE" as const })),
        ...mockNetworkUsers.map((u) => ({ ...u, onboardingStatus: "DONE" as const })),
        { ...mockReseauUser, onboardingStatus: "DONE" as const },
      ],
      results: [...mockJanuaryResults, ...mockResults, ...mockNetworkJanuaryResults, ...mockNetworkResults],
      ratioConfigs: JSON.parse(JSON.stringify(defaultRatioConfigs)),
      institutions: [
        { id: "org-demo", name: "NXT Immobilier", inviteCode: "ORG-DEMO" },
        ...mockNetworkInstitutions,
      ],
      networks: mockNetworks,
      hiddenViews: [],
      agencyObjective: { annualCA: 500000, avgActValue: 12000 },
      financialData: { ...mockFinancialData },
      // Mock historique : 2 mois précédents (mars + février 2026) pour tester
      // le bouton "Reprendre le mois dernier" (PR2i).
      financialDataHistory: {
        "2026-02": {
          caTransaction: 38000,
          caGestion: 8000,
          caSyndic: 5000,
          caAutres: 2200,
          chargesFixesMensuelles: 22000,
          masseSalarialeMensuelle: 15000,
          tresorerieDisponible: 92000,
          dettesCourtTerme: 11000,
          fondsMandants: 30000,
        },
        "2026-03": {
          caTransaction: 32000,
          caGestion: 8000,
          caSyndic: 5000,
          caAutres: 1800,
          chargesFixesMensuelles: 22000,
          masseSalarialeMensuelle: 15000,
          tresorerieDisponible: 78000,
          dettesCourtTerme: 13000,
          fondsMandants: 26000,
        },
      },
      directorCosts: {
        commissionDirecteur: 50,
        commissionManagers: 10,
        commissionConseillers: 5,
        coutsFixes: 8000,
        masseSalariale: 15000,
        autresCharges: 3000,
      },
    });
  },

  exitDemo: () => {
    document.cookie = "nxt-demo-mode=;path=/;max-age=0";
    set({
      isDemo: false,
      isDemoMode: false,
      isAuthenticated: false,
      user: null,
      users: [],
      results: [],
      ratioConfigs: JSON.parse(JSON.stringify(defaultRatioConfigs)),
      institutions: [],
      teamInfos: [],
      networks: [],
      hiddenViews: [],
      agencyObjective: null,
      directorCosts: null,
      financialData: {},
      financialDataHistory: {},
    });
  },

  // ── Auth (demo mode only — Supabase mode uses supabase.auth directly) ──
  login: (email, password) => {
    const found = get().users.find((u) => u.email === email);
    if (!found) return "not_found";
    if (found.password && found.password !== password) return "wrong_password";
    set({ user: found, isAuthenticated: true, hiddenViews: [] });
    return "success";
  },

  logout: () => {
    const isDemo = get().isDemo;
    if (isDemo) {
      get().exitDemo();
    } else {
      set({
      user: null, isAuthenticated: false, isDemoMode: false, profile: null,
      orgInviteCode: null, orgLogoUrl: null, hiddenViews: [],
      users: [], results: [],
    });
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
      // Use available_roles from DB if present, else derive from primary role
      const rawAvailable = profile.available_roles;
      const availableRoles: UserRole[] = Array.isArray(rawAvailable) && rawAvailable.length > 0
        ? rawAvailable as UserRole[]
        : deriveAvailableRoles(role);
      const user: User = {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        mainRole: role,
        role,
        availableRoles,
        category: profile.category,
        teamId: profile.team_id ?? "",
        avatarUrl: profile.avatar_url ?? undefined,
        createdAt: profile.created_at,
        onboardingStatus: (profile.onboarding_status as OnboardingStatus) ?? "DONE",
        profileType: (profile.profile_type as ProfileType) ?? undefined,
        institutionId: profile.org_id ?? undefined,
      };
      set({ profile, user, isAuthenticated: true, hiddenViews: [] });
    } else {
      set({ profile: null, user: null, isAuthenticated: false, hiddenViews: [] });
    }
  },

  setAuthenticated: (authed) => set({ isAuthenticated: authed }),

  setOrgInviteCode: (code) => set({ orgInviteCode: code }),
  setOrgLogoUrl: (url) => set({ orgLogoUrl: url }),

  // ── Data actions ──
  setUser: (user) => set({ user }),

  switchRole: (targetRole) => {
    const current = get().user;
    if (!current) return null;
    // Permission guard: only switch to roles the user actually has
    if (!current.availableRoles.includes(targetRole)) return null;
    // No-op if already on this role
    if (current.role === targetRole) return null;
    // Same user, just change active role
    set({ user: { ...current, role: targetRole } });
    return DEFAULT_ROUTES[targetRole];
  },

  /** Demo only — cycles through mock users for testing. Isolated from prod switchRole. */
  switchDemoUser: () => {
    const current = get().user;
    if (!current) return;
    const users = get().users;
    const currentIdx = users.findIndex((u) => u.id === current.id);
    if (currentIdx === -1) return;
    // Cycle to next user
    const nextUser = users[(currentIdx + 1) % users.length];
    set({ user: nextUser, hiddenViews: [] });
  },

  addUser: (user) => {
    set((state) => {
      // Idempotent: skip if user with same id already exists
      if (state.users.some((u) => u.id === user.id)) return state;
      return { users: [...state.users, user] };
    });
  },

  setUsers: (users) => set({ users }),

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
      results: [
        ...state.results.filter(
          (r) =>
            r.id !== result.id &&
            !(r.userId === result.userId && r.periodType === result.periodType && r.periodStart === result.periodStart)
        ),
        result,
      ],
    }));
  },

  setResults: (results) => set({ results }),

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

}));
