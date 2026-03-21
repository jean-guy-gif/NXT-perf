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
import { getTourStatus, getTourSteps, getTourRole } from "@/lib/guided-tour";

const SIDEBAR_KEY = "nxt-sidebar-collapsed";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const isDemo = useAppStore((s) => s.isDemo);
  const user = useAppStore((s) => s.user);
  const setProfile = useAppStore((s) => s.setProfile);
  const setOrgInviteCode = useAppStore((s) => s.setOrgInviteCode);
  const router = useRouter();
  const [loading, setLoading] = useState(!isAuthenticated);

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

  // On mount, check Supabase session before redirecting
  useEffect(() => {
    if (isAuthenticated) {
      setLoading(false);
      return;
    }

    const checkSession = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // Retry profile fetch — trigger may still be running after signup
      let profile = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) { profile = data; break; }
        await new Promise((r) => setTimeout(r, 1000));
      }

      if (!profile) {
        // User authenticated but no profile yet → onboarding
        router.replace("/onboarding");
        return;
      }

      setProfile(profile);

      // Load org invite code for manager equipe page
      if (profile.org_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("invite_code")
          .eq("id", profile.org_id)
          .single();
        if (org) {
          setOrgInviteCode(org.invite_code);
        }
      }

      setLoading(false);
    };

    checkSession();
  }, [isAuthenticated, router, setProfile, setOrgInviteCode]);

  // Onboarding guard: redirect to /onboarding if not done (skip in demo mode)
  useEffect(() => {
    if (!isAuthenticated || isDemo || loading) return;
    if (user && user.onboardingStatus && user.onboardingStatus !== "DONE") {
      router.replace("/onboarding");
    }
  }, [isAuthenticated, isDemo, loading, user, router]);

  // Auto-launch guided tour on first visit after account creation
  useEffect(() => {
    if (!isAuthenticated || loading || !user) return;
    // Small delay to let the dashboard render first
    const timer = setTimeout(() => {
      const tourRole = getTourRole(user.availableRoles, user.mainRole);
      const status = getTourStatus(tourRole);
      if (status === "unseen") {
        setShowTour(true);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [isAuthenticated, loading, user]);

  // Tour data
  const tourRole = user ? getTourRole(user.availableRoles, user.mainRole) : "conseiller";
  const tourSteps = getTourSteps(tourRole);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Don't render dashboard if onboarding not done (non-demo)
  if (!isDemo && user?.onboardingStatus && user.onboardingStatus !== "DONE") return null;

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
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <SupabaseProvider>{children}</SupabaseProvider>
        </main>
      </div>

      <MobileSidebar />

      {showTour && (
        <GuidedTour
          steps={tourSteps}
          role={tourRole}
          onComplete={() => setShowTour(false)}
        />
      )}
    </div>
  );
}
