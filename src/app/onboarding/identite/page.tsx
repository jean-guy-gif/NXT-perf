"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AvatarEditor from "react-avatar-editor";
import { Camera, Building2, Upload, Loader2, Check, ArrowRight, ZoomIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";
import { compressImage, ImageCompressionError } from "@/lib/compress-image";
import { extractAgencyColors, applyAgencyTheme } from "@/lib/agency-theme";

// ── Types ────────────────────────────────────────────────────────────────────

type CoachVoice = "sport" | "sergent" | "bienveillant";

const COACH_VOICES: { id: CoachVoice; emoji: string; label: string; desc: string }[] = [
  { id: "sport", emoji: "\u{1F3C3}", label: "Coach Sport", desc: "Motivant, dynamique, orient\u00e9 performance. Il te pousse \u00e0 te d\u00e9passer." },
  { id: "sergent", emoji: "\u{1F396}\uFE0F", label: "Sergent", desc: "Direct, exigeant, sans filtre. Les r\u00e9sultats d\u2019abord, les excuses dehors." },
  { id: "bienveillant", emoji: "\u{1F91D}", label: "Coach Bienveillant", desc: "Doux, encourageant, \u00e0 l\u2019\u00e9coute. Il t\u2019accompagne sans pression." },
];

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

  // ── Init coachVoice from profile ──────────────────────────────────────
  useEffect(() => {
    if (profile?.coach_voice) setCoachVoice(profile.coach_voice);
  }, [profile?.coach_voice]);

  // ── Redirect if already completed ──────────────────────────────────────
  useEffect(() => {
    if (isDemo) { router.replace("/dashboard"); return; }
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

        console.log("Tentative", attempt + 1, "— org_id:", freshProfile?.org_id);

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

      const supabase = createClient();
      const path = `${user.id}/avatar.webp`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true, contentType: "image/webp" });

      if (upErr) {
        setError(`Erreur upload : ${upErr.message}`);
        setAvatarUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
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
  }, [user?.id, profile, setProfile]);

  // ── Logo upload ────────────────────────────────────────────────────────
  // If user has org_id → upload to logos/{org_id}/ and update organizations.logo_url
  // If no org_id → upload to logos/{user_id}/ and update profiles.agency_logo_url
  const handleLogoFile = useCallback(async (file: File) => {
    setError("");
    setLogoUploading(true);

    try {
      const blob = await compressImage(file, { maxSize: 400, maxBytes: 150 * 1024 });
      const previewUrl = URL.createObjectURL(blob);
      setLogoPreview(previewUrl);

      if (!user?.id) { setLogoUploading(false); return; }

      const supabase = createClient();

      if (hasOrg) {
        // ── Org-linked upload ──
        const path = `${profile!.org_id}/logo.webp`;
        const { error: upErr } = await supabase.storage
          .from("logos")
          .upload(path, blob, { upsert: true, contentType: "image/webp" });
        if (upErr) { setError(`Erreur upload : ${upErr.message}`); setLogoUploading(false); return; }

        const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path);
        await supabase.from("organizations").update({ logo_url: publicUrl }).eq("id", profile!.org_id);

        // Extract and apply colors
        try {
          const { primary, secondary } = await extractAgencyColors(publicUrl);
          await supabase.from("organizations").update({ primary_color: primary, secondary_color: secondary }).eq("id", profile!.org_id);
          applyAgencyTheme(primary, secondary);
        } catch { /* color extraction is best-effort */ }
      } else {
        // ── Solo upload (no org) ──
        const path = `${user.id}/logo.webp`;
        const { error: upErr } = await supabase.storage
          .from("logos")
          .upload(path, blob, { upsert: true, contentType: "image/webp" });
        if (upErr) { setError(`Erreur upload : ${upErr.message}`); setLogoUploading(false); return; }

        const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path);
        await supabase.from("profiles").update({ agency_logo_url: publicUrl }).eq("id", user.id);

        // Extract and apply colors to profile
        try {
          const { primary, secondary } = await extractAgencyColors(publicUrl);
          await supabase.from("profiles").update({ agency_primary_color: primary, agency_secondary_color: secondary }).eq("id", user.id);
          if (profile) setProfile({ ...profile, agency_logo_url: publicUrl, agency_primary_color: primary, agency_secondary_color: secondary });
          applyAgencyTheme(primary, secondary);
        } catch { /* best-effort */ }
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
    if (!isDemo && user?.id) {
      const supabase = createClient();
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true, coach_voice: coachVoice })
        .eq("id", user.id);

      if (updateErr) {
        console.error("[onboarding] Failed to save onboarding_completed:", updateErr.message);
      }

      if (profile) {
        setProfile({ ...profile, onboarding_completed: true, coach_voice: coachVoice });
      }
    }

    window.location.href = "/dashboard";
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Bienvenue, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Personnalise ton profil avant de commencer.
          </p>
        </div>

        {/* DEBUG — diagnostic temporaire */}
        <pre className="mx-auto max-w-xs rounded bg-muted/50 p-2 text-[10px] text-muted-foreground">
          {JSON.stringify({ org_id: profile?.org_id ?? null, loading: loadingProfile }, null, 2)}
        </pre>

        {/* Upload zones */}
        {loadingProfile ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Row 1: Avatar + Logo */}
            <div className={`grid gap-6 ${isCoachExterne ? "" : "sm:grid-cols-2"}`}>
              {/* ── Avatar with interactive crop ── */}
              <div
                className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border bg-card/50 p-6 transition-all hover:border-primary/30 hover:bg-primary/5"
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
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
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
                      className="rounded-full object-cover border-2 border-border"
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
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <Upload className="h-3 w-3" />
                  {avatarDone ? "Changer" : "Choisir un fichier"}
                </button>
                <p className="text-[10px] text-muted-foreground">ou glisser-déposer ici</p>

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

            {/* Row 2: Coach Voice Selection */}
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-base font-semibold text-foreground">Votre voix coach</h2>
                <p className="text-xs text-muted-foreground mt-1">Choisissez le style de coaching de votre assistant IA</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {COACH_VOICES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setCoachVoice(v.id)}
                    className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-5 text-center transition-all ${
                      coachVoice === v.id
                        ? "border-[var(--agency-primary,#6C5CE7)] bg-[var(--agency-primary,#6C5CE7)]/5 shadow-sm"
                        : "border-border bg-card/50 hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    {coachVoice === v.id && (
                      <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--agency-primary,#6C5CE7)]">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <span className="text-2xl">{v.emoji}</span>
                    <p className="text-sm font-semibold text-foreground">{v.label}</p>
                    <p className="text-[11px] leading-snug text-muted-foreground">{v.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <p className="text-center text-sm text-red-400">{error}</p>
        )}

        {/* CTA */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={completeOnboarding}
            disabled={completing}
            className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Accéder à mon dashboard
          </button>

          <button
            type="button"
            onClick={completeOnboarding}
            className="text-xs text-muted-foreground hover:text-muted-foreground/70 transition-colors"
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
      className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border bg-card/50 p-6 transition-all hover:border-primary/30 hover:bg-primary/5"
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
            className={`object-cover border-2 border-border ${previewShape === "circle" ? "rounded-full" : "rounded-xl bg-white"}`}
            style={{ width: 80, height: 80 }}
          />
          {done && (
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
      ) : (
        <div className={`flex h-20 w-20 items-center justify-center ${previewShape === "circle" ? "rounded-full" : "rounded-xl"} bg-muted text-muted-foreground`}>
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
        className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
        {done ? "Changer" : "Choisir un fichier"}
      </button>

      <p className="text-[10px] text-muted-foreground">ou glisser-déposer ici</p>

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
