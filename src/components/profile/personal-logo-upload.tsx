"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";
import { extractAgencyColorsFromBlob, applyAgencyTheme } from "@/lib/agency-theme";

/**
 * Logo upload for users without an org_id.
 * Stores logo in logos/{userId}/ and saves URL + extracted colors to profiles.
 */
export function PersonalLogoUpload({ size = 64 }: { size?: number }) {
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const isDemo = useAppStore((s) => s.isDemo);

  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(profile?.agency_logo_url);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isDemo || !user?.id) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) return;

    setUploading(true);

    // Extract colors from local file BEFORE upload (avoids CORS)
    const { primary, secondary } = await extractAgencyColorsFromBlob(file);
    applyAgencyTheme(primary, secondary);

    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/logo.${ext}`;

    const { error } = await supabase.storage
      .from("logos")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) {
      console.error("[personal-logo] Upload error:", error.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path);
    await supabase.from("profiles").update({
      agency_logo_url: publicUrl,
      agency_primary_color: primary,
      agency_secondary_color: secondary,
    }).eq("id", user.id);

    setLogoUrl(publicUrl);
    if (profile) setProfile({ ...profile, agency_logo_url: publicUrl, agency_primary_color: primary, agency_secondary_color: secondary });

    setUploading(false);
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative group flex items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted overflow-hidden"
        style={{ width: size, height: size }}
      >
        {logoUrl ? (
          <Image src={logoUrl} alt="Logo" width={size} height={size} className="object-contain" style={{ width: size, height: size }} />
        ) : (
          <Upload className="h-5 w-5 text-muted-foreground" />
        )}

        {!isDemo && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl"
          >
            {uploading ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Upload className="h-4 w-4 text-white" />}
          </button>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        <p>Logo personnel</p>
        <p>PNG ou JPG, max 2 Mo</p>
      </div>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/svg+xml" className="hidden" onChange={handleUpload} />
    </div>
  );
}
