"use client";

import { useState, useEffect } from "react";
import { Mic, Check, Volume2 } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";
import { speakText } from "@/lib/tts-service";
import { PERSONAS, DEFAULT_PERSONA, isValidPersona } from "@/lib/personas";
import type { PersonaId } from "@/lib/personas";

type InputMode = "audio_full" | "text_audio" | "text_keyboard";

const INPUT_MODES: { id: InputMode; emoji: string; label: string }[] = [
  { id: "audio_full", emoji: "🎙️", label: "Audio complet (IA parle + je réponds à l'oral)" },
  { id: "text_audio", emoji: "👁️", label: "Questions à l'écran + réponse à l'oral" },
  { id: "text_keyboard", emoji: "⌨️", label: "Tout à l'écran (texte + clavier)" },
];

export default function VoixParametresPage() {
  const user = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);

  const [persona, setPersona] = useState<PersonaId>(DEFAULT_PERSONA);
  const [inputMode, setInputMode] = useState<InputMode>("audio_full");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [playing, setPlaying] = useState<PersonaId | null>(null);

  useEffect(() => {
    if (isDemo || !user?.id) return;
    const supabase = createClient();
    supabase
      .from("user_voice_preferences")
      .select("persona, input_mode")
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) return;
        if (data?.persona && isValidPersona(data.persona)) setPersona(data.persona);
        if (data?.input_mode) setInputMode(data.input_mode as InputMode);
      });
  }, [user?.id, isDemo]);

  const handleSave = async () => {
    if (!user?.id || isDemo) { setSaved(true); setTimeout(() => setSaved(false), 2000); return; }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("user_voice_preferences").upsert({
      user_id: user.id, persona, input_mode: inputMode, updated_at: new Date().toISOString(),
    });
    if (error) { setSaving(false); return; }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const handleListen = async (p: typeof PERSONAS[0]) => {
    setPlaying(p.id);
    const res = await speakText(p.example, "conversation", p.id);
    if (res) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { URL.revokeObjectURL(url); setPlaying(null); };
      audio.onerror = () => { URL.revokeObjectURL(url); setPlaying(null); };
      audio.play();
    } else {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(p.example);
        u.lang = "fr-FR"; u.onend = () => setPlaying(null);
        window.speechSynthesis.speak(u);
      } else { setPlaying(null); }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Mic className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Voix &amp; Saisie</h1>
          <p className="text-sm text-muted-foreground">
            Choisis ta voix de guidage et ton mode de saisie.
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Voix de guidage</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {PERSONAS.map((p) => (
            <button key={p.id} type="button" onClick={() => { setPersona(p.id); setSaved(false); }}
              className={`relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${persona === p.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card hover:border-primary/30"}`}>
              {persona === p.id && <div className="absolute top-3 right-3"><Check className="h-4 w-4 text-primary" /></div>}
              <div className="flex items-center gap-2">
                <span className="text-xl">{p.emoji}</span>
                <span className="text-sm font-semibold text-foreground">{p.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{p.description}</p>
              <p className="text-xs text-muted-foreground/70 italic">{p.example}</p>
              <button type="button" onClick={(e) => { e.stopPropagation(); handleListen(p); }} disabled={playing !== null}
                className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50">
                <Volume2 className="h-3 w-3" /> {playing === p.id ? "Lecture…" : "Écouter un extrait"}
              </button>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Mode de saisie par défaut</h2>
        <div className="space-y-2">
          {INPUT_MODES.map((m) => (
            <button key={m.id} type="button" onClick={() => { setInputMode(m.id); setSaved(false); }}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${inputMode === m.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
              <span className="text-lg">{m.emoji}</span>
              <span className="text-sm text-foreground">{m.label}</span>
              {inputMode === m.id && <Check className="h-4 w-4 text-primary ml-auto" />}
            </button>
          ))}
        </div>
      </section>

      <button type="button" onClick={handleSave} disabled={saving}
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
        {saved ? "Préférences sauvegardées ✓" : saving ? "Enregistrement…" : "Enregistrer mes préférences"}
      </button>
    </div>
  );
}
