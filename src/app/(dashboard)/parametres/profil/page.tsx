"use client";

import { useAppStore } from "@/stores/app-store";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { LogoUpload } from "@/components/profile/logo-upload";
import { ThemePicker } from "@/components/profile/theme-picker";
import { User as UserIcon } from "lucide-react";

export default function ProfilParametresPage() {
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const isDemo = useAppStore((s) => s.isDemo);

  const hasOrg = !!profile?.org_id;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <UserIcon className="h-5 w-5" /> Mon profil
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Photo de profil et personnalisation.</p>
      </div>

      {/* Avatar */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Photo de profil</h2>
        <div className="flex items-center gap-6">
          <AvatarUpload size={96} />
          <div>
            <p className="text-sm font-medium text-foreground">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground capitalize mt-1">{user?.mainRole} · {user?.category}</p>
          </div>
        </div>
      </section>

      {/* Logo agence — visible pour tout utilisateur rattaché à une agence */}
      {hasOrg && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Logo de l&apos;agence</h2>
          <LogoUpload orgId={profile!.org_id} />
        </section>
      )}

      {/* Theme agence — visible pour tout utilisateur rattaché à une agence */}
      {hasOrg && (
        <section className="space-y-3">
          <ThemePicker orgId={profile!.org_id} />
        </section>
      )}
    </div>
  );
}
