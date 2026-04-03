"use client";

import { useState } from "react";
import { Check, Palette } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";
import { applyAgencyTheme } from "@/lib/agency-theme";

const PRESET_THEMES = [
  { name: "NXT Classique", primary: "#6C5CE7", secondary: "#4A3FB5" },
  { name: "Bleu Ocean", primary: "#0984E3", secondary: "#0652DD" },
  { name: "Vert Forêt", primary: "#00B894", secondary: "#00896A" },
  { name: "Rouge Passion", primary: "#E17055", secondary: "#D63031" },
  { name: "Or Premium", primary: "#FDCB6E", secondary: "#E1A921" },
  { name: "Violet Royal", primary: "#A29BFE", secondary: "#6C5CE7" },
];

interface ThemePickerProps {
  orgId: string;
  currentPrimary?: string;
  currentSecondary?: string;
  onChanged?: (primary: string, secondary: string) => void;
}

export function ThemePicker({ orgId, currentPrimary, currentSecondary, onChanged }: ThemePickerProps) {
  const isDemo = useAppStore((s) => s.isDemo);
  const [primary, setPrimary] = useState(currentPrimary || "#6C5CE7");
  const [secondary, setSecondary] = useState(currentSecondary || "#4A3FB5");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handlePreset = (p: string, s: string) => {
    setPrimary(p);
    setSecondary(s);
    setSaved(false);
  };

  const handleSave = async () => {
    if (isDemo) {
      applyAgencyTheme(primary, secondary);
      setSaved(true); setTimeout(() => setSaved(false), 2000); return;
    }
    setSaving(true);
    const supabase = createClient();
    await supabase.from("organizations").update({ primary_color: primary, secondary_color: secondary }).eq("id", orgId);
    applyAgencyTheme(primary, secondary);
    onChanged?.(primary, secondary);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isSelected = (p: string, s: string) => p === primary && s === secondary;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Thème de l&apos;agence</h3>
      </div>

      {/* Presets */}
      <div className="grid grid-cols-3 gap-2">
        {PRESET_THEMES.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => handlePreset(t.primary, t.secondary)}
            className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all ${
              isSelected(t.primary, t.secondary)
                ? "border-foreground ring-1 ring-foreground/30"
                : "border-border hover:border-foreground/20"
            }`}
          >
            <div className="flex gap-1">
              <div className="h-5 w-5 rounded-full" style={{ background: t.primary }} />
              <div className="h-5 w-5 rounded-full" style={{ background: t.secondary }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{t.name}</span>
            {isSelected(t.primary, t.secondary) && (
              <Check className="absolute top-1 right-1 h-3 w-3 text-foreground" />
            )}
          </button>
        ))}
      </div>

      {/* Custom color inputs */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Principale
          <input type="color" value={primary} onChange={(e) => { setPrimary(e.target.value); setSaved(false); }}
            className="h-8 w-8 rounded border border-border cursor-pointer" />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Secondaire
          <input type="color" value={secondary} onChange={(e) => { setSecondary(e.target.value); setSaved(false); }}
            className="h-8 w-8 rounded border border-border cursor-pointer" />
        </label>
      </div>

      {/* Preview */}
      <div className="flex items-center gap-3 rounded-lg border border-border p-3">
        <div className="h-10 w-10 rounded-lg" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }} />
        <div className="text-xs text-muted-foreground">Aperçu du dégradé</div>
      </div>

      <button type="button" onClick={handleSave} disabled={saving}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
        {saved ? "Thème sauvegardé ✓" : saving ? "Enregistrement…" : "Appliquer le thème"}
      </button>
    </div>
  );
}
