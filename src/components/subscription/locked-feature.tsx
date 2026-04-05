"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/use-subscription";

interface LockedFeatureProps {
  feature: string;
  featureName: string;
  featureDescription: string;
  children: React.ReactNode;
}

export function LockedFeature({ feature, featureName, featureDescription, children }: LockedFeatureProps) {
  const { canAccess, isLoading } = useSubscription();
  const router = useRouter();

  if (isLoading) return <>{children}</>;

  if (canAccess(feature)) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card/95 p-8 shadow-lg backdrop-blur-sm max-w-sm text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            Débloquez {featureName}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {featureDescription}
          </p>
          <button
            type="button"
            onClick={() => router.push("/souscrire")}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Souscrire — 9€/mois
          </button>
        </div>
      </div>
    </div>
  );
}
