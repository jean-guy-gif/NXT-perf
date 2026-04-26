"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useManagerScopeStore } from "@/stores/manager-scope-store";
import { useAppStore } from "@/stores/app-store";
import type { User } from "@/types/user";

interface UseManagerScopeReturn {
  scope: "team" | "individual";
  conseillerId: string | null;
  conseiller: User | null;
  teamId: string | null;
  isTeamScope: boolean;
  isIndividualScope: boolean;
  setScope: (s: "team" | "individual") => void;
  selectConseiller: (id: string | null) => void;
}

export function useManagerScope(): UseManagerScopeReturn {
  const scope = useManagerScopeStore((s) => s.scope);
  const selectedConseillerId = useManagerScopeStore((s) => s.selectedConseillerId);
  const setScope = useManagerScopeStore((s) => s.setScope);
  const selectConseiller = useManagerScopeStore((s) => s.selectConseiller);

  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.user);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const conseiller: User | null = selectedConseillerId
    ? users.find((u) => u.id === selectedConseillerId) ?? null
    : null;

  const teamId = currentUser?.teamId ?? null;

  // ── Sync URL → store at mount only (decision D1: stay on current page, sync URL into store)
  const initialSyncDone = useRef(false);
  useEffect(() => {
    if (initialSyncDone.current) return;
    initialSyncDone.current = true;
    const urlConseillerId = searchParams.get("conseiller");
    if (urlConseillerId && urlConseillerId !== selectedConseillerId) {
      selectConseiller(urlConseillerId);
      if (scope !== "individual") {
        setScope("individual");
      }
    }
  }, [searchParams, selectedConseillerId, scope, selectConseiller, setScope]);

  // ── Sync store → URL whenever store state changes (with anti-loop guard)
  useEffect(() => {
    if (!initialSyncDone.current) return;
    const currentUrlId = searchParams.get("conseiller");

    if (scope === "individual" && selectedConseillerId) {
      if (currentUrlId !== selectedConseillerId) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("conseiller", selectedConseillerId);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    } else {
      if (currentUrlId) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("conseiller");
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      }
    }
  }, [scope, selectedConseillerId, pathname, router, searchParams]);

  return {
    scope,
    conseillerId: selectedConseillerId,
    conseiller,
    teamId,
    isTeamScope: scope === "team",
    isIndividualScope: scope === "individual",
    setScope,
    selectConseiller,
  };
}
