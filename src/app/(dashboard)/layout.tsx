"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { useAppStore } from "@/stores/app-store";
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const isDemo = useAppStore((s) => s.isDemo);
  const setProfile = useAppStore((s) => s.setProfile);
  const router = useRouter();
  const [loading, setLoading] = useState(!isAuthenticated);

  // On mount, check Supabase session before redirecting
  useEffect(() => {
    if (isAuthenticated) {
      setLoading(false);
      return;
    }

    const checkSession = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profile) {
          setProfile(profile);
          setLoading(false);
          return;
        }
      }

      router.replace("/welcome");
    };

    checkSession();
  }, [isAuthenticated, router, setProfile]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

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
      <aside className="hidden lg:flex lg:w-[72px] lg:flex-col lg:border-r lg:border-border lg:bg-sidebar">
        <Sidebar />
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <SupabaseProvider>{children}</SupabaseProvider>
        </main>
      </div>

      <MobileSidebar />
    </div>
  );
}
