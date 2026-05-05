"use client";

import { useState } from "react";
import { Check, Loader2, User as UserIcon } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { LogoUpload } from "@/components/profile/logo-upload";
import { ThemePicker } from "@/components/profile/theme-picker";
import { PersonalLogoUpload } from "@/components/profile/personal-logo-upload";
import { PersonalThemePicker } from "@/components/profile/personal-theme-picker";
import { createClient } from "@/lib/supabase/client";
import { awardBadgeIfEarned } from "@/lib/badge-service";
import { useBadges } from "@/hooks/use-badges";
import { BadgeGrid } from "@/components/badges/badge-grid";
import { PerformanceBadgeGrid } from "@/components/badges/performance-badge-grid";

type CoachVoice = "sport" | "sergent" | "bienveillant";

const COACH_VOICES: { id: CoachVoice; emoji: string; label: string; desc: string }[] = [
  { id: "sport", emoji: "\u{1F3C3}", label: "Coach Sport", desc: "Motivant, dynamique, orient\u00e9 performance." },
  { id: "sergent", emoji: "\u{1F396}\uFE0F", label: "Sergent", desc: "Direct, exigeant, sans filtre." },
  { id: "bienveillant", emoji: "\u{1F91D}", label: "Coach Bienveillant", desc: "Doux, encourageant, \u00e0 l\u2019\u00e9coute." },
];

export default function ProfilParametresPage() {
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const isDemo = useAppStore((s) => s.isDemo);

  const hasOrg = !!profile?.org_id;
  const isCoachExterne = profile?.profile_type === "COACH" && !hasOrg;

  const [coachVoice, setCoachVoice] = useState<CoachVoice>(profile?.coach_voice || "bienveillant");
  const [savingVoice, setSavingVoice] = useState(false);
  const [voiceSaved, setVoiceSaved] = useState(false);

  const handleSaveVoice = async (voice: CoachVoice) => {
    setCoachVoice(voice);
    if (isDemo || !user?.id) return;

    setSavingVoice(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ coach_voice: voice }).eq("id", user.id);
    if (error) { setSavingVoice(false); return; }
    if (profile) setProfile({ ...profile, coach_voice: voice });
    awardBadgeIfEarned(supabase, user.id, "ma_voix").catch(() => {});
    setSavingVoice(false);
    setVoiceSaved(true);
    setTimeout(() => setVoiceSaved(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <UserIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mon profil</h1>
          <p className="text-sm text-muted-foreground">
            Photo de profil et personnalisation.
          </p>
        </div>
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

      {/* Logo agence — visible pour tous sauf coach externe */}
      {!isCoachExterne && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Logo de l&apos;agence</h2>
          {hasOrg ? (
            <LogoUpload orgId={profile!.org_id} />
          ) : (
            <PersonalLogoUpload />
          )}
        </section>
      )}

      {/* Theme agence — visible pour tous sauf coach externe */}
      {!isCoachExterne && (
        <section className="space-y-3">
          {hasOrg ? (
            <ThemePicker orgId={profile!.org_id} />
          ) : (
            <PersonalThemePicker />
          )}
        </section>
      )}

      {/* Voix coach */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Voix coach</h2>
        <p className="text-xs text-muted-foreground">Le style de coaching de votre assistant IA.</p>

        <div className="grid gap-3 md:grid-cols-3">
          {COACH_VOICES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => handleSaveVoice(v.id)}
              disabled={savingVoice}
              className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                coachVoice === v.id
                  ? "border-[var(--agency-primary,#6C5CE7)] bg-[var(--agency-primary,#6C5CE7)]/5 shadow-sm"
                  : "border-border bg-card/50 hover:border-primary/30 hover:bg-primary/5"
              }`}
            >
              {coachVoice === v.id && (
                <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--agency-primary,#6C5CE7)]">
                  {savingVoice ? (
                    <Loader2 className="h-3 w-3 text-white animate-spin" />
                  ) : (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
              )}
              <span className="text-xl">{v.emoji}</span>
              <p className="text-sm font-semibold text-foreground">{v.label}</p>
              <p className="text-[11px] leading-snug text-muted-foreground">{v.desc}</p>
            </button>
          ))}
        </div>

        {voiceSaved && (
          <p className="text-center text-xs text-green-500">Pr\u00e9f\u00e9rence sauvegard\u00e9e</p>
        )}
      </section>

      {/* Statut & honoraires moyens (chantier A.2) */}
      <StatusAndCommissionSection />

      {/* Performance Badges */}
      <PerformanceBadgeGrid />

      {/* Gamification Badges */}
      <BadgeGridSection />
    </div>
  );
}

// ─── Section Statut & Honoraires (chantier A.2) ──────────────────────────

type AgentStatus = "salarie" | "agent_commercial" | "mandataire";

const AGENT_STATUSES: { id: AgentStatus; label: string; desc: string }[] = [
  { id: "salarie", label: "Salarié", desc: "Contrat de travail." },
  { id: "agent_commercial", label: "Agent commercial", desc: "RSAC indépendant." },
  { id: "mandataire", label: "Mandataire", desc: "Réseau de mandataires." },
];

function StatusAndCommissionSection() {
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const agencyObjective = useAppStore((s) => s.agencyObjective);
  const setAgencyObjective = useAppStore((s) => s.setAgencyObjective);
  const isDemo = useAppStore((s) => s.isDemo);

  const [status, setStatus] = useState<AgentStatus | null>(
    (profile?.agent_status as AgentStatus | null) ?? null,
  );
  const [commission, setCommission] = useState<string>(
    String(agencyObjective?.avgActValue ?? 8000),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const commissionNum = Number(commission) || 0;

  const handleSave = async () => {
    if (isDemo || !user?.id || !status || commissionNum <= 0) return;
    setSaving(true);
    try {
      const supabase = createClient();

      // 1. profiles.agent_status
      await supabase
        .from("profiles")
        .update({ agent_status: status })
        .eq("id", user.id);
      if (profile) setProfile({ ...profile, agent_status: status });

      // 2. objectives.input.avg_commission_eur (merge)
      const currentYear = new Date().getFullYear();
      const { data: existing } = await supabase
        .from("objectives")
        .select("input")
        .eq("user_id", user.id)
        .eq("year", currentYear)
        .single();
      const existingInput =
        (existing?.input as Record<string, unknown> | null) ?? {};
      const mergedInput = {
        ...existingInput,
        avg_commission_eur: commissionNum,
      };
      await supabase.from("objectives").upsert(
        {
          user_id: user.id,
          year: currentYear,
          input: mergedInput,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,year" },
      );

      // Hydrate Zustand
      setAgencyObjective({
        annualCA: agencyObjective?.annualCA ?? 0,
        avgActValue: commissionNum,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
        Statut et honoraires
      </h2>
      <p className="text-xs text-muted-foreground">
        Servent à adapter votre diagnostic et chiffrer le manque à gagner.
      </p>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Statut</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {AGENT_STATUSES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatus(s.id)}
              className={`flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all ${
                status === s.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card/50 hover:border-primary/30 hover:bg-primary/5"
              }`}
            >
              <span className="text-sm font-semibold text-foreground">
                {s.label}
              </span>
              <span className="text-xs leading-snug text-muted-foreground">
                {s.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          Honoraires moyens par acte (€)
        </p>
        <div className="relative max-w-xs">
          <input
            type="number"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            min={0}
            step={500}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            €
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !status || commissionNum <= 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          Enregistrer
        </button>
        {saved && (
          <span className="text-xs text-green-500">Préférence sauvegardée</span>
        )}
      </div>
    </section>
  );
}

function BadgeGridSection() {
  const { earnedBadges, loading } = useBadges();
  if (loading) return null;
  return <BadgeGrid earnedBadges={earnedBadges} />;
}
