"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";

interface AvatarUploadProps {
  size?: number;
  className?: string;
}

export function AvatarUpload({ size = 80, className = "" }: AvatarUploadProps) {
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const isDemo = useAppStore((s) => s.isDemo);

  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const avatarUrl = profile?.avatar_url;
  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "??";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || isDemo) return;

    // Validate
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return; // 5MB max

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar.${ext}`;

    // Upload to avatars bucket
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

    // Update profile
    const { error: updateErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    if (updateErr) { setUploading(false); return; }

    // Update local store
    if (profile) {
      setProfile({ ...profile, avatar_url: publicUrl });
    }

    setUploading(false);
  };

  const handleDelete = async () => {
    if (!user?.id || isDemo || !avatarUrl) return;

    setDeleting(true);
    const supabase = createClient();

    // Remove file from storage
    await supabase.storage.from("avatars").remove([`${user.id}/avatar.webp`]);

    // Update profile to clear avatar_url
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
    if (!error && profile) {
      setProfile({ ...profile, avatar_url: null });
    }

    setDeleting(false);
    setShowDeleteConfirm(false);
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="relative group" style={{ width: size, height: size }}>
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={initials}
            width={size}
            height={size}
            className="rounded-full object-cover border-2 border-border"
            style={{ width: size, height: size }}
          />
        ) : (
          <div
            className="flex items-center justify-center rounded-full bg-gradient-nxt text-white font-semibold"
            style={{ width: size, height: size, fontSize: size * 0.35 }}
          >
            {initials}
          </div>
        )}

        {/* Upload overlay */}
        {!isDemo && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* Delete button */}
      {!isDemo && avatarUrl && !showDeleteConfirm && (
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Supprimer la photo
        </button>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-xs text-foreground text-center">
            Votre photo sera supprimée définitivement.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Small avatar display (no upload) for use in header, lists, etc. */
export function AvatarDisplay({
  avatarUrl,
  initials,
  size = 32,
  className = "",
}: {
  avatarUrl?: string | null;
  initials: string;
  size?: number;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={initials}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gradient-nxt text-white font-semibold ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}
