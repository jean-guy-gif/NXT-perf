"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { useAppStore } from "@/stores/app-store";
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { GuidedTour } from "@/components/tour/guided-tour";
import { getTourStatus, getTourSteps, getTourRole, persistTourCompleted } from "@/lib/guided-tour";
import { applyAgencyTheme, resetToDefaultTheme } from "@/lib/agency-theme";
import { BadgeCelebration } from "@/components/badges/badge-celebration";
import { CoachBubble } from "@/components/coach/coach-bubble";
import { CoachDock } from "@/components/coach/coach-dock";
import { useCoachSession } from "@/stores/coach-session-store";

const SIDEBAR_KEY = "nxt-sidebar-collapsed";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const isDemo = useAppStore((s) => s.isDemo);
  const user = useAppStore((s) => s.user);
  const enterDemo = useAppStore((s) => s.enterDemo);
  const setProfile = useAppStore((s) => s.setProfile);
  const setOrgInviteCode = useAppStore((s) => s.setOrgInviteCode);
  const setOrgLogoUrl = useAppStore((s) => s.setOrgLogoUrl);

  // NXT Coach — rehydration au mount
  const resumeSession = useCoachSession((s) => s.resumeSession);

  // NXT Coach — tenter reprise de session active au mount
  useEffect(() => {
    if (isAuthenticated && !isDemo) {
      resumeSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-hydrate demo mode from cookie if store was lost (page reload on Vercel)
  useEffect(() => {
    if (!isDemo && !isAuthenticated && typeof document !== "undefined") {
      const hasDemoCookie = document.cookie.split(";").some(c => c.trim().startsWith("nxt-demo-mode=true"));
      if (hasDemoCookie) {
        enterDemo();
      }
    }
  }, [isDemo, isAuthenticated, enterDemo]);

  // Apply default theme for demo mode (no org-specific colors)
  useEffect(() => {
    if (isDemo) resetToDefaultTheme();
  }, [isDemo]);

  // hasSession: true if Supabase has a valid session (even if profile not yet loaded)
  const [hasSession, setHasSession] = useState(isAuthenticated || isDemo);
  const [checking, setChecking] = useState(!isAuthenticated && !isDemo);

  // Sidebar collapsed state — default collapsed (true) to match current UX
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Guided tour state
  const [showTour, setShowTour] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY);
    if (stored !== null) {
      setSidebarCollapsed(stored === "true");
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  }, []);

  // On mount, check if Supabase has a valid session
  // NEVER redirect to /login — only the middleware does that
  useEffect(() => {
    if (isAuthenticated || isDemo) {
      setHasSession(true);
      setChecking(false);
      return;
    }

    let cancelled = false;

    const checkSession = async () => {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (cancelled) return;

        if (authUser) {
          setHasSession(true);
          // Try to load profile — SupabaseProvider will also try via useSupabaseProfile
          // but we do it here too for faster initial render
          const { data: profileData, error: profileErr } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .single();
          if (profileErr) return;

          if (!cancelled && profileData) {
            setProfile(profileData);
            // Redirect to onboarding if not completed
            if (profileData.onboarding_completed === false) {
              window.location.href = "/onboarding/identite";
              return;
            }
            // Load org invite code + agency theme
            if (profileData.org_id) {
              const { data: org, error: orgErr } = await supabase
                .from("organizations")
                .select("invite_code, primary_color, secondary_color, logo_url")
                .eq("id", profileData.org_id)
                .single();
              if (orgErr) { /* org load failed — continue with defaults */ }
              if (org) {
                setOrgInviteCode(org.invite_code);
                setOrgLogoUrl(org.logo_url ?? null);
                if (org.primary_color && org.secondary_color) {
                  applyAgencyTheme(org.primary_color, org.secondary_color);
                } else {
                  resetToDefaultTheme();
                }
              }
            } else if (profileData.agency_primary_color && profileData.agency_secondary_color) {
              // Fallback: per-profile agency colors (user uploaded logo without org)
              applyAgencyTheme(profileData.agency_primary_color, profileData.agency_secondary_color);
            } else {
              resetToDefaultTheme();
            }
          }
          // If no profile yet, that's OK — useSupabaseProfile will retry with fallback
        }
        // If no authUser, just show spinner — middleware will redirect on next navigation
      } catch {
        // Supabase unavailable — show spinner, don't crash
      }

      if (!cancelled) setChecking(false);
    };

    checkSession();
    return () => { cancelled = true; };
  }, [isAuthenticated, isDemo, setProfile, setOrgInviteCode, setOrgLogoUrl]);

  // Auto-launch guided tour on first visit after account creation
  useEffect(() => {
    if (!isAuthenticated || checking || !user) return;
    const timer = setTimeout(() => {
      const tourRole = getTourRole(user.availableRoles, user.mainRole);
      const status = getTourStatus(tourRole);
      if (status === "unseen") {
        setShowTour(true);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [isAuthenticated, checking, user]);

  // Tour data
  const tourRole = user ? getTourRole(user.availableRoles, user.mainRole) : "conseiller";
  const tourSteps = getTourSteps(tourRole);

  // Show spinner while checking session or waiting for profile
  if (checking || (!isAuthenticated && !isDemo)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          {hasSession && (
            <p className="text-sm text-muted-foreground">Chargement du profil...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-screen overflow-hidden bg-background", isDemo && "pt-8")}>
      {isDemo && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
          Mode démo — Les données ne sont pas sauvegardées.{" "}
          <a href="/register" className="underline hover:no-underline">
            Créer un compte
          </a>
        </div>
      )}
      <div className="relative hidden lg:flex">
        <aside
          className={cn(
            "flex flex-col border-r border-border bg-sidebar transition-all duration-300",
            sidebarCollapsed ? "w-[72px]" : "w-[240px]"
          )}
        >
          <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        </aside>

        {/* Floating edge toggle */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3.5 top-1/2 z-50 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
          title={sidebarCollapsed ? "Déplier la barre" : "Replier la barre"}
        >
          {sidebarCollapsed ? (
            <ChevronsRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronsLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Header />
        <DpiGpsReminders />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <SupabaseProvider>{children}</SupabaseProvider>
        </main>
      </div>

      <MobileSidebar />

      {showTour && (
        <GuidedTour
          steps={tourSteps}
          role={tourRole}
          onComplete={() => {
            setShowTour(false);
            if (user?.id && !isDemo) persistTourCompleted(user.id);
          }}
        />
      )}

      <BadgeCelebration />

      {/* NXT Coach — surcouche overlay */}
      <CoachBubble />
      <CoachDock />
    </div>
  );
}

function DpiGpsReminders() {
  const profile = useAppStore((s) => s.profile);
  const isDemo = useAppStore((s) => s.isDemo);
  const [dismissed, setDismissed] = useState(false);

  if (isDemo || dismissed || !profile) return null;

  const today = new Date();
  const isFirstMondayOfMonth = today.getDay() === 1 && today.getDate() <= 7;

  // DPI monthly reminder
  const lastDpi = (profile as unknown as Record<string, unknown>).last_dpi_date as string | null;
  const lastDpiDate = lastDpi ? new Date(lastDpi) : null;
  const dpiDoneThisMonth = lastDpiDate &&
    lastDpiDate.getMonth() === today.getMonth() &&
    lastDpiDate.getFullYear() === today.getFullYear();

  const dismissKey = `nxt-dpi-dismissed-${today.toISOString().slice(0, 10)}`;
  const wasDismissedToday = typeof window !== "undefined" && localStorage.getItem(dismissKey) === "true";

  if (isFirstMondayOfMonth && !dpiDoneThisMonth && !wasDismissedToday) {
    return (
      <div className="flex items-center justify-center gap-3 bg-primary/10 px-3 py-2 text-xs">
        <span>Votre DPI mensuel est disponible — Faites-le en 3 minutes</span>
        <a href="/onboarding/dpi" className="font-semibold text-primary underline">Faire mon DPI</a>
        <button type="button" onClick={() => { localStorage.setItem(dismissKey, "true"); setDismissed(true); }}
          className="text-muted-foreground hover:text-foreground">Plus tard</button>
      </div>
    );
  }

  // GPS annual reminder (first Monday of January)
  const lastGps = (profile as unknown as Record<string, unknown>).last_gps_date as string | null;
  const lastGpsDate = lastGps ? new Date(lastGps) : null;
  const gpsThisYear = lastGpsDate && lastGpsDate.getFullYear() === today.getFullYear();

  if (isFirstMondayOfMonth && today.getMonth() === 0 && !gpsThisYear) {
    return (
      <div className="flex items-center justify-center gap-3 bg-amber-500/10 px-3 py-2 text-xs">
        <span>Redéfinissez vos objectifs pour la nouvelle année</span>
        <a href="/onboarding/gps" className="font-semibold text-amber-600 underline">Définir mes objectifs</a>
      </div>
    );
  }

  return null;
}
