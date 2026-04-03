"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Building2, Upload, Loader2, Check, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";
import { compressImage, ImageCompressionError } from "@/lib/compress-image";

// ── Component ────────────────────────────────────────────────────────────────

export default function OnboardingIdentitePage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const isDemo = useAppStore((s) => s.isDemo);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [avatarDone, setAvatarDone] = useState(false);
  const [logoDone, setLogoDone] = useState(false);
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const hasOrg = !!profile?.org_id;
  const firstName = user?.firstName || "Conseiller";

  // ── Redirect if already completed ──────────────────────────────────────
  useEffect(() => {
    if (isDemo) { router.replace("/dashboard"); return; }
    if (profile?.onboarding_completed) { router.replace("/dashboard"); }
  }, [profile?.onboarding_completed, isDemo, router]);

  // ── Upload handler (shared logic) ─────────────────────────────────────
  const handleFile = useCallback(async (
    file: File,
    type: "avatar" | "logo",
  ) => {
    setError("");
    const setUploading = type === "avatar" ? setAvatarUploading : setLogoUploading;
    const setPreview = type === "avatar" ? setAvatarPreview : setLogoPreview;
    const setDone = type === "avatar" ? setAvatarDone : setLogoDone;

    try {
      // Compress
      setUploading(true);
      const blob = await compressImage(file, {
        maxSize: type === "avatar" ? 400 : 400,
        maxBytes: 150 * 1024,
      });

      // Preview
      const previewUrl = URL.createObjectURL(blob);
      setPreview(previewUrl);

      if (!user?.id) { setUploading(false); return; }

      const supabase = createClient();
      const bucket = type === "avatar" ? "avatars" : "logos";
      const folder = type === "avatar" ? user.id : profile?.org_id;
      if (!folder) { setUploading(false); return; }

      const path = `${folder}/${type}.webp`;

      // Upload
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, blob, { upsert: true, contentType: "image/webp" });

      if (upErr) {
        setError(`Erreur upload : ${upErr.message}`);
        setUploading(false);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

      // Update DB
      if (type === "avatar") {
        await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
        if (profile) setProfile({ ...profile, avatar_url: publicUrl });
      } else {
        await supabase.from("organizations").update({ logo_url: publicUrl }).eq("id", profile!.org_id);
      }

      setDone(true);
      setUploading(false);
    } catch (err) {
      setUploading(false);
      if (err instanceof ImageCompressionError) {
        setError(err.message);
      } else {
        setError("Erreur inattendue lors du traitement de l'image.");
      }
    }
  }, [user?.id, profile, setProfile]);

  // ── Drag & drop handler ────────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent, type: "avatar" | "logo") => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file, type);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  // ── Complete onboarding ────────────────────────────────────────────────
  const completeOnboarding = async () => {
    setCompleting(true);
    if (!isDemo && user?.id) {
      const supabase = createClient();
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    }
    router.push("/dashboard");
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

        {/* Upload zones */}
        <div className={`grid gap-6 ${hasOrg ? "sm:grid-cols-2" : "max-w-sm mx-auto"}`}>
          {/* Avatar */}
          <UploadZone
            label="Photo de profil"
            hint="Visible par ton équipe et ton manager"
            icon={<Camera className="h-6 w-6" />}
            preview={avatarPreview}
            previewShape="circle"
            uploading={avatarUploading}
            done={avatarDone}
            inputRef={avatarInputRef}
            onFileSelect={(f) => handleFile(f, "avatar")}
            onDrop={(e) => handleDrop(e, "avatar")}
            onDragOver={handleDragOver}
          />

          {/* Logo agence */}
          {hasOrg && (
            <UploadZone
              label="Logo de l'agence"
              hint="Affiché sur les exports et le classement"
              icon={<Building2 className="h-6 w-6" />}
              preview={logoPreview}
              previewShape="square"
              uploading={logoUploading}
              done={logoDone}
              inputRef={logoInputRef}
              onFileSelect={(f) => handleFile(f, "logo")}
              onDrop={(e) => handleDrop(e, "logo")}
              onDragOver={handleDragOver}
            />
          )}
        </div>

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
      {/* Preview or placeholder */}
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

      {/* Label */}
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>

      {/* Upload button */}
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
