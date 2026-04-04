"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";
import { extractAgencyColorsFromBlob, applyAgencyTheme } from "@/lib/agency-theme";

interface LogoUploadProps {
  orgId: string;
  currentLogoUrl?: string | null;
  onUploaded?: (url: string) => void;
  onColorsExtracted?: (primary: string, secondary: string) => void;
  size?: number;
}

export function LogoUpload({ orgId, currentLogoUrl, onUploaded, onColorsExtracted, size = 64 }: LogoUploadProps) {
  const isDemo = useAppStore((s) => s.isDemo);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isDemo) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) return; // 2MB max

    setUploading(true);

    // Extract colors from local file BEFORE upload (avoids CORS)
    const { primary, secondary, dark } = await extractAgencyColorsFromBlob(file);
    applyAgencyTheme(primary, secondary, dark);

    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${orgId}/logo.${ext}`;

    const { error } = await supabase.storage
      .from("logos")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) {
      console.error("[logo] Upload error:", error.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path);

    await supabase.from("organizations").update({
      logo_url: publicUrl,
      primary_color: primary,
      secondary_color: secondary,
    }).eq("id", orgId);

    setLogoUrl(publicUrl);
    onUploaded?.(publicUrl);
    onColorsExtracted?.(primary, secondary);

    setUploading(false);
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative group flex items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted overflow-hidden"
        style={{ width: size, height: size }}
      >
        {logoUrl ? (
          <Image src={logoUrl} alt="Logo agence" width={size} height={size} className="object-contain" style={{ width: size, height: size }} />
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
        <p>Logo de l&apos;agence</p>
        <p>PNG ou JPG, max 2 Mo</p>
      </div>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/svg+xml" className="hidden" onChange={handleUpload} />
    </div>
  );
}
