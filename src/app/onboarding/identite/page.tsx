"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AvatarEditor from "react-avatar-editor";
import {
  Camera,
  Building2,
  Upload,
  Loader2,
  Check,
  ArrowRight,
  ZoomIn,
  Volume2,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";
import { compressImage, ImageCompressionError } from "@/lib/compress-image";
import { extractAgencyColorsFromBlob, applyAgencyTheme } from "@/lib/agency-theme";
import { ImportPerformance } from "@/components/onboarding/import-performance";
import { ImportTeam } from "@/components/onboarding/import-team";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type CoachVoice = "sport" | "sergent" | "bienveillant";

const COACH_VOICES: { id: CoachVoice; emoji: string; label: string; desc: string }[] = [
  { id: "sport", emoji: "\u{1F3C3}", label: "Coach Sport", desc: "Motivant, dynamique, orienté performance. Il te pousse à te dépasser." },
  { id: "sergent", emoji: "\u{1F396}️", label: "Sergent", desc: "Direct, exigeant, sans filtre. Les résultats d’abord, les excuses dehors." },
  { id: "bienveillant", emoji: "\u{1F91D}", label: "Coach Bienveillant", desc: "Doux, encourageant, à l’écoute. Il t’accompagne sans pression." },
];

const VOICE_DEMOS: Record<CoachVoice, { text: string; persona: string }> = {
  sport: { text: "Allez, on y va ! Tu as les résultats pour performer, maintenant il faut s'y mettre !", persona: "sport_coach" },
  sergent: { text: "Résultats insuffisants. On rectifie ça immédiatement. Pas d'excuses.", persona: "warrior" },
  bienveillant: { text: "Très bien, tu avances à ton rythme. Je suis là pour t'accompagner.", persona: "kind_coach" },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function OnboardingIdentitePage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const isDemo = useAppStore((s) => s.isDemo);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [avatarDone, setAvatarDone] = useState(false);
  const [logoDone, setLogoDone] = useState(false);
  const [avatarZoom, setAvatarZoom] = useState(1.2);
  const [coachVoice, setCoachVoice] = useState<CoachVoice>("bienveillant");
  const [playingVoice, setPlayingVoice] = useState<CoachVoice | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);

  const hasOrg = !!profile?.org_id;
  const isCoachExterne = profile?.profile_type === "COACH" && !hasOrg;
  const firstName = user?.firstName || "Conseiller";

  // ── Voice preview handler ──────────────────────────────────────────────
  const handleListenVoice = async (voice: CoachVoice) => {
    // Stop any currently playing audio
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current = null;
    }
    if (playingVoice === voice) { setPlayingVoice(null); return; }

    setPlayingVoice(voice);
    const demo = VOICE_DEMOS[voice];
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: demo.text, persona: demo.persona }),
      });
      if (!res.ok) { setPlayingVoice(null); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { URL.revokeObjectURL(url); setPlayingVoice(null); voiceAudioRef.current = null; };
      audio.onerror = () => { URL.revokeObjectURL(url); setPlayingVoice(null); voiceAudioRef.current = null; };
      voiceAudioRef.current = audio;
      audio.play();
    } catch { setPlayingVoice(null); }
  };

  // ── Init coachVoice from profile ──────────────────────────────────────
  useEffect(() => {
    if (profile?.coach_voice) setCoachVoice(profile.coach_voice);
  }, [profile?.coach_voice]);

  // ── Redirect if already completed ──────────────────────────────────────
  useEffect(() => {
    if (isDemo) {
      const demoOnboardingDone = typeof document !== "undefined"
        && document.cookie.includes("nxt-demo-onboarding=true");
      if (demoOnboardingDone) { router.replace("/dashboard"); return; }
      return;
    }
    if (profile?.onboarding_completed) { router.replace("/dashboard"); }
  }, [profile?.onboarding_completed, isDemo, router]);

  // ── Refetch profile from Supabase on mount ─────────────────────────────
  useEffect(() => {
    if (isDemo) { setLoadingProfile(false); return; }

    let cancelled = false;
    const refetchProfile = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || cancelled) { setLoadingProfile(false); return; }

      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: freshProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (cancelled) return;

        if (process.env.NODE_ENV === "development") console.log("Tentative", attempt + 1, "— org_id:", freshProfile?.org_id);

        if (freshProfile) {
          setProfile(freshProfile);
          if (freshProfile.org_id) break;
          if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
        }
      }
      if (!cancelled) setLoadingProfile(false);
    };

    refetchProfile();
    return () => { cancelled = true; };
  }, [isDemo, setProfile]);

  // ── Validate crop and upload avatar ────────────────────────────────────
  const handleAvatarCropConfirm = useCallback(async () => {
    if (!editorRef.current || !user?.id) return;
    setError("");
    setAvatarUploading(true);

    try {
      const canvas = editorRef.current.getImageScaledToCanvas();
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b: Blob | null) => (b ? resolve(b) : reject(new Error("Canvas vide"))),
          "image/webp",
          0.85,
        );
      });

      const file = new File([blob], "avatar.webp", { type: "image/webp" });
      const compressed = await compressImage(file, { maxSize: 400, maxBytes: 150 * 1024 });

      const previewUrl = URL.createObjectURL(compressed);
      setAvatarPreview(previewUrl);

      // Demo mode: store preview locally only, no Supabase upload
      if (isDemo) {
        setAvatarDone(true);
        setAvatarFile(null);
        setAvatarUploading(false);
        return;
      }

      const supabase = createClient();

      let userId: string | null = null;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        userId = session.user.id;
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        userId = authUser?.id ?? null;
      }

      if (!userId) {
        setError("Session expirée — veuillez vous reconnecter");
        setAvatarUploading(false);
        return;
      }

      const path = `${userId}/avatar.webp`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true, contentType: "image/webp" });

      if (upErr) {
        setError(`Erreur upload : ${upErr.message}`);
        setAvatarUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: profErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
      if (profErr) { setError(`Erreur profil : ${profErr.message}`); setAvatarUploading(false); return; }
      if (profile) setProfile({ ...profile, avatar_url: publicUrl });

      setAvatarDone(true);
      setAvatarFile(null);
    } catch (err) {
      if (err instanceof ImageCompressionError) {
        setError(err.message);
      } else {
        setError("Erreur inattendue lors du traitement de l'image.");
      }
    } finally {
      setAvatarUploading(false);
    }
  }, [user?.id, isDemo, profile, setProfile]);

  // ── Logo upload ────────────────────────────────────────────────────────
  const handleLogoFile = useCallback(async (file: File) => {
    setError("");
    setLogoUploading(true);

    try {
      const blob = await compressImage(file, { maxSize: 400, maxBytes: 150 * 1024 });
      const previewUrl = URL.createObjectURL(blob);
      setLogoPreview(previewUrl);

      if (!user?.id) { setLogoUploading(false); return; }

      const { primary, secondary, dark, light } = await extractAgencyColorsFromBlob(blob);
      applyAgencyTheme(primary, secondary, dark, light);

      // Demo mode: store preview locally only, no Supabase upload
      if (isDemo) {
        setLogoDone(true);
        setLogoUploading(false);
        return;
      }

      const supabase = createClient();

      if (hasOrg) {
        const path = `${profile!.org_id}/logo.webp`;
        const { error: upErr } = await supabase.storage
          .from("logos")
          .upload(path, blob, { upsert: true, contentType: "image/webp" });
        if (upErr) { setError(`Erreur upload : ${upErr.message}`); setLogoUploading(false); return; }

        const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path);
        await supabase.from("organizations").update({ logo_url: publicUrl, primary_color: primary, secondary_color: secondary }).eq("id", profile!.org_id);
      } else {
        const path = `${user.id}/logo.webp`;
        const { error: upErr } = await supabase.storage
          .from("logos")
          .upload(path, blob, { upsert: true, contentType: "image/webp" });
        if (upErr) { setError(`Erreur upload : ${upErr.message}`); setLogoUploading(false); return; }

        const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path);
        await supabase.from("profiles").update({ agency_logo_url: publicUrl, agency_primary_color: primary, agency_secondary_color: secondary }).eq("id", user.id);
        if (profile) setProfile({ ...profile, agency_logo_url: publicUrl, agency_primary_color: primary, agency_secondary_color: secondary });
      }

      setLogoDone(true);
    } catch (err) {
      if (err instanceof ImageCompressionError) {
        setError(err.message);
      } else {
        setError("Erreur inattendue lors du traitement de l'image.");
      }
    } finally {
      setLogoUploading(false);
    }
  }, [user?.id, profile, hasOrg, setProfile]);

  // ── Drop handlers ─────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  // ── Complete onboarding ────────────────────────────────────────────────
  const completeOnboarding = async () => {
    setCompleting(true);

    if (isDemo) {
      document.cookie = "nxt-demo-onboarding=true;path=/;max-age=28800";
      window.location.href = "/conseiller/diagnostic?gate=1";
      return;
    } else if (user?.id) {
      document.cookie = "nxt-demo-mode=;path=/;max-age=0";
      document.cookie = "nxt-demo-onboarding=;path=/;max-age=0";
      document.cookie = "nxt-demo-saisie=;path=/;max-age=0";
      const supabase = createClient();
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true, coach_voice: coachVoice })
        .eq("id", user.id);

      if (updateErr) {
        if (process.env.NODE_ENV === "development") console.error("[onboarding] Failed to save onboarding_completed:", updateErr.message);
      }

      if (profile) {
        setProfile({ ...profile, onboarding_completed: true, coach_voice: coachVoice });
      }
    }

    window.location.href = "/onboarding/dpi";
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-3xl space-y-10">
        {/* ═══ HEADER ═══ */}
        <header className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Personnalisation
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Bienvenue, {firstName}
          </h1>
          <p className="mt-3 text-muted-foreground">
            Personnalisez votre profil avant de commencer. Cela ne prend qu&apos;une minute.
          </p>
        </header>

        {/* Loading state */}
        {loadingProfile ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Chargement de votre profil…</p>
          </div>
        ) : (
          <>
            {/* ═══ SECTION 2 — IDENTITÉ ═══ */}
            <section>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Camera className="h-3.5 w-3.5" />
                Identité
              </div>
              <h2 className="mb-3 text-2xl font-bold text-foreground">
                Votre photo et le logo de votre agence
              </h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Visible par votre équipe, votre manager et sur les exports.
              </p>

              <div className={cn("grid gap-6", !isCoachExterne && "md:grid-cols-2")}>
                {/* ── Avatar with interactive crop ── */}
                <div
                  className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border bg-card/50 p-6 transition-all hover:border-primary/30 hover:bg-primary/5"
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) setAvatarFile(f);
                  }}
                  onDragOver={handleDragOver}
                >
                  {avatarFile && !avatarDone ? (
                    <>
                      <AvatarEditor
                        ref={editorRef}
                        image={avatarFile}
                        width={160}
                        height={160}
                        borderRadius={80}
                        border={20}
                        color={[0, 0, 0, 0.4]}
                        scale={avatarZoom}
                        rotate={0}
                      />
                      <div className="flex w-full items-center gap-2 px-2">
                        <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="range"
                          min={1}
                          max={3}
                          step={0.05}
                          value={avatarZoom}
                          onChange={(e) => setAvatarZoom(Number(e.target.value))}
                          className="h-1.5 w-full cursor-pointer accent-primary"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAvatarCropConfirm}
                        disabled={avatarUploading}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        {avatarUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Valider le cadrage
                      </button>
                    </>
                  ) : avatarPreview ? (
                    <div className="relative">
                      <Image
                        src={avatarPreview}
                        alt="Photo de profil"
                        width={80}
                        height={80}
                        className="rounded-full border-2 border-border object-cover"
                        style={{ width: 80, height: 80 }}
                      />
                      {avatarDone && (
                        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Camera className="h-6 w-6" />
                    </div>
                  )}

                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Photo de profil</p>
                    <p className="text-xs text-muted-foreground">Visible par ton équipe et ton manager</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <Upload className="h-3 w-3" />
                    {avatarDone ? "Changer" : "Choisir un fichier"}
                  </button>
                  <p className="text-xs text-muted-foreground">ou glisser-déposer ici</p>

                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setAvatarDone(false);
                        setAvatarPreview(null);
                        setAvatarFile(f);
                      }
                    }}
                  />
                </div>

                {/* ── Logo agence zone — visible pour tous sauf coach externe ── */}
                {!isCoachExterne && (
                  <UploadZone
                    label="Logo de l'agence"
                    hint={hasOrg ? "Affiché sur les exports et le classement" : "Personnalise ton interface avec ton logo"}
                    icon={<Building2 className="h-6 w-6" />}
                    preview={logoPreview}
                    previewShape="square"
                    uploading={logoUploading}
                    done={logoDone}
                    inputRef={logoInputRef}
                    onFileSelect={(f) => handleLogoFile(f)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files[0];
                      if (f) handleLogoFile(f);
                    }}
                    onDragOver={handleDragOver}
                  />
                )}
              </div>
            </section>

            {/* ═══ SECTION 3 — VOIX COACH ═══ */}
            <section>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Volume2 className="h-3.5 w-3.5" />
                Voix coach
              </div>
              <h2 className="mb-3 text-2xl font-bold text-foreground">
                Choisissez votre style de coaching
              </h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Sélectionnez la personnalité qui vous fera progresser. Cliquez sur Écouter
                pour tester chaque voix.
              </p>

              <div className="grid gap-3 md:grid-cols-3">
                {COACH_VOICES.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setCoachVoice(v.id)}
                    className={cn(
                      "relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-5 text-center transition-all",
                      coachVoice === v.id
                        ? "border-[var(--agency-primary,#6C5CE7)] bg-[var(--agency-primary,#6C5CE7)]/5 shadow-sm"
                        : "border-border bg-card/50 hover:border-primary/30 hover:bg-primary/5"
                    )}
                  >
                    {coachVoice === v.id && (
                      <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--agency-primary,#6C5CE7)]">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <span className="text-2xl">{v.emoji}</span>
                    <p className="text-sm font-semibold text-foreground">{v.label}</p>
                    <p className="text-xs leading-snug text-muted-foreground">{v.desc}</p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleListenVoice(v.id); }}
                      disabled={playingVoice !== null && playingVoice !== v.id}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      {playingVoice === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Volume2 className="h-3 w-3" />}
                      {playingVoice === v.id ? "Lecture…" : "Écouter"}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* ═══ SECTION 4 — IMPORT PERFORMANCE ═══ */}
            <ImportPerformance isDemo={isDemo} />

            {/* ═══ SECTION 5 — IMPORT TEAM (manager/directeur only) ═══ */}
            {(user?.mainRole === "manager" || user?.mainRole === "directeur") && (
              <ImportTeam isDemo={isDemo} />
            )}
          </>
        )}

        {/* Error encart */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {/* CTA bloc */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={completeOnboarding}
            disabled={completing}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {completing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Patientez…
              </>
            ) : (
              <>
                Suivant
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground">
            Vous pourrez modifier ces infos plus tard
          </p>

          <button
            type="button"
            onClick={() => { window.location.href = "/onboarding/dpi"; }}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Passer cette étape
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Upload Zone Sub-component ────────────────────────────────────────────────

interface UploadZoneProps {
  label: string;
  hint: string;
  icon: React.ReactNode;
  preview: string | null;
  previewShape: "circle" | "square";
  uploading: boolean;
  done: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (file: File) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}

function UploadZone({
  label, hint, icon, preview, previewShape, uploading, done,
  inputRef, onFileSelect, onDrop, onDragOver,
}: UploadZoneProps) {
  return (
    <div
      className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border bg-card/50 p-6 transition-all hover:border-primary/30 hover:bg-primary/5"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {preview ? (
        <div className="relative">
          <Image
            src={preview}
            alt={label}
            width={80}
            height={80}
            className={cn(
              "border-2 border-border object-cover",
              previewShape === "circle" ? "rounded-full" : "rounded-xl bg-white"
            )}
            style={{ width: 80, height: 80 }}
          />
          {done && (
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
      ) : (
        <div className={cn(
          "flex h-20 w-20 items-center justify-center bg-muted text-muted-foreground",
          previewShape === "circle" ? "rounded-full" : "rounded-xl"
        )}>
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : icon}
        </div>
      )}

      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
        {done ? "Changer" : "Choisir un fichier"}
      </button>

      <p className="text-xs text-muted-foreground">ou glisser-déposer ici</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/gif"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); }}
      />
    </div>
  );
}
