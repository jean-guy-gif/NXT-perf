"use client";

import { useState } from "react";
import { Check, Palette } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";
import { applyAgencyTheme } from "@/lib/agency-theme";

const PRESET_THEMES = [
  { name: "NXT Classique", primary: "#6C5CE7", secondary: "#4A3FB5" },
  { name: "Bleu Ocean", primary: "#0984E3", secondary: "#0652DD" },
  { name: "Vert For\u00eat", primary: "#00B894", secondary: "#00896A" },
  { name: "Rouge Passion", primary: "#E17055", secondary: "#D63031" },
  { name: "Or Premium", primary: "#FDCB6E", secondary: "#E1A921" },
  { name: "Violet Royal", primary: "#A29BFE", secondary: "#6C5CE7" },
];

/**
 * Theme picker for users without an org_id.
 * Saves colors to profiles.agency_primary_color / agency_secondary_color.
 */
export function PersonalThemePicker() {
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const isDemo = useAppStore((s) => s.isDemo);

  const [primary, setPrimary] = useState(profile?.agency_primary_color || "#6C5CE7");
  const [secondary, setSecondary] = useState(profile?.agency_secondary_color || "#4A3FB5");
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
    if (!user?.id) return;
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ agency_primary_color: primary, agency_secondary_color: secondary })
      .eq("id", user.id);
    if (profile) setProfile({ ...profile, agency_primary_color: primary, agency_secondary_color: secondary });
    applyAgencyTheme(primary, secondary);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isSelected = (p: string, s: string) => p === primary && s === secondary;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Th\u00e8me personnel</h3>
      </div>

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

      <div className="flex items-center gap-3 rounded-lg border border-border p-3">
        <div className="h-10 w-10 rounded-lg" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }} />
        <div className="text-xs text-muted-foreground">Aper\u00e7u du d\u00e9grad\u00e9</div>
      </div>

      <button type="button" onClick={handleSave} disabled={saving}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
        {saved ? "Th\u00e8me sauvegard\u00e9 \u2713" : saving ? "Enregistrement\u2026" : "Appliquer le th\u00e8me"}
      </button>
    </div>
  );
}
