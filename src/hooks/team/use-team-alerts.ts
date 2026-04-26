"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAllResults } from "@/hooks/use-results";
import { computeNotifications, type AppNotification } from "@/lib/notifications";
import type { User } from "@/types/user";

interface UseTeamAlertsReturn {
  loading: boolean;
  perConseillerNotifs: Map<string, AppNotification[]>;
  managerSpecificAlerts: AppNotification[];
}

/**
 * Aggregate team alerts — extracted from /manager/cockpit (alerts + priorityAlerts).
 * - perConseillerNotifs: per-conseiller computed notifications (saisie en retard, ratios critiques, etc.)
 * - managerSpecificAlerts: alerts for the manager themselves (computeManagerNotifications dispatched on user.role)
 */
export function useTeamAlerts(teamId?: string): UseTeamAlertsReturn {
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);
  const ratioConfigs = useAppStore((s) => s.ratioConfigs);
  const allResults = useAllResults();

  const effectiveTeamId = teamId ?? currentUser?.teamId ?? null;

  const conseillers = useMemo<User[]>(() => {
    if (!currentUser) return [];
    return users.filter((u) => {
      if (u.role !== "conseiller") return false;
      if (isDemo) return u.teamId === effectiveTeamId;
      return u.managerId === currentUser.id;
    });
  }, [users, currentUser, isDemo, effectiveTeamId]);

  const perConseillerNotifs = useMemo(() => {
    const map = new Map<string, AppNotification[]>();
    for (const c of conseillers) {
      const userResults = allResults.filter((r) => r.userId === c.id);
      const notifs = computeNotifications(c, userResults, users, ratioConfigs);
      map.set(c.id, notifs);
    }
    return map;
  }, [conseillers, allResults, users, ratioConfigs]);

  const managerSpecificAlerts = useMemo(() => {
    if (!currentUser) return [];
    return computeNotifications(currentUser, allResults, users, ratioConfigs);
  }, [currentUser, allResults, users, ratioConfigs]);

  return {
    loading: false,
    perConseillerNotifs,
    managerSpecificAlerts,
  };
}
