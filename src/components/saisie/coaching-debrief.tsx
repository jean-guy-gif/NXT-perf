"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Target, CheckCircle, AlertTriangle, ChevronRight, Volume2, Sparkles } from "lucide-react";
import type { PeriodResults } from "@/types/results";
import type { RatioConfig, RatioId } from "@/types/ratios";
import type { UserCategory } from "@/types/user";
import { generateCoachingDebrief } from "@/lib/coaching-debrief";
import { generateAIDebrief } from "@/lib/coaching-ai-client";
import type { CoachingDebrief, VolumeVerdict, ActionItem, AgentProfile } from "@/lib/coaching-debrief";
import type { AIDebriefText } from "@/lib/coaching-ai-client";

// ── TTS ──────────────────────────────────────────────────────────────────────

function speakTTS(text: string, onEnd?: () => void): void {
  if (typeof window === "undefined" || !window.speechSynthesis) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR"; u.rate = 0.92; u.pitch = 1.05;
  const voices = window.speechSynthesis.getVoices();
  const fr = voices.filter(v => v.lang === "fr-FR" || v.lang.startsWith("fr-"));
  const sel = fr.find(v => v.name.includes("Google français")) || fr[0] || voices[0];
  if (sel) u.voice = sel;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

// ── Props ────────────────────────────────────────────────────────────────────

interface CoachingDebriefScreenProps {
  results: PeriodResults;
  category: UserCategory;
  ratioConfigs: Record<RatioId, RatioConfig>;
  onClose: () => void;
}

// ── Labels ───────────────────────────────────────────────────────────────────

const verdictLabel: Record<VolumeVerdict, string> = {
  above: "Au-dessus du cap", on_track: "Dans le cap", below: "En dessous", no_data: "Pas de données",
};
const verdictColor: Record<VolumeVerdict, string> = {
  above: "text-green-400", on_track: "text-primary", below: "text-amber-400", no_data: "text-muted-foreground",
};
const profileLabel: Record<AgentProfile, string> = {
  high_performer: "Semaine solide", correct: "Semaine correcte", low_volume: "Volume à renforcer",
  low_conversion: "Conversion à travailler", mixed: "Semaine à ajuster", insufficient_data: "Données insuffisantes",
};
const profileEmoji: Record<AgentProfile, string> = {
  high_performer: "💪", correct: "👍", low_volume: "📈", low_conversion: "🎯", mixed: "⚡", insufficient_data: "📊",
};
const actionIcon: Record<ActionItem["type"], typeof Target> = {
  volume: TrendingUp, performance: Target, discipline: CheckCircle,
};

// ── Component ────────────────────────────────────────────────────────────────

export function CoachingDebriefScreen({ results, category, ratioConfigs, onClose }: CoachingDebriefScreenProps) {
  const debrief = useMemo(() => generateCoachingDebrief(results, category, ratioConfigs), [results, category, ratioConfigs]);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [aiText, setAiText] = useState<AIDebriefText | null>(null);
  const [aiLoading, setAiLoading] = useState(true);

  // Fetch AI reformulation in background — local debrief is shown immediately
  useEffect(() => {
    if (debrief.profile === "insufficient_data") {
      setAiLoading(false);
      return;
    }
    let cancelled = false;
    generateAIDebrief(debrief).then((result) => {
      if (!cancelled) {
        setAiText(result);
        setAiLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [debrief]);

  const handlePlayAudio = () => {
    const script = aiText?.audioScript || debrief.audioScript;
    setAudioPlaying(true);
    speakTTS(script, () => setAudioPlaying(false));
  };

  // Use AI text if available, otherwise fall back to local
  const title = aiText?.title || profileLabel[debrief.profile];
  const summary = aiText?.overallSummary;
  const volumeText = aiText?.volumeText;
  const performanceText = aiText?.performanceText;
  const strengthsText = aiText?.strengthsText;
  const watchoutsText = aiText?.watchoutsText;
  const nextWeekText = aiText?.nextWeekText;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background overflow-y-auto">
      <div className="mx-auto w-full max-w-lg px-5 py-6 space-y-6">

        {/* Header */}
        <div className="text-center space-y-2 transition-all duration-300">
          <p className="text-3xl">{profileEmoji[debrief.profile]}</p>
          <h1 className="text-xl font-bold text-foreground transition-all duration-300">{title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed min-h-[20px] transition-all duration-300">
            {summary || "Ton débrief coaching de la semaine"}
          </p>
          {debrief.profile !== "insufficient_data" && (
            <div className="flex justify-center gap-4 pt-1">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{debrief.volumeScore}</p>
                <p className="text-[10px] text-muted-foreground">Volume</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{debrief.performanceScore}</p>
                <p className="text-[10px] text-muted-foreground">Performance</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{debrief.compositeScore}</p>
                <p className="text-[10px] text-muted-foreground">Global</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-center gap-3">
            <button type="button" onClick={handlePlayAudio} disabled={audioPlaying}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50">
              <Volume2 className="h-3.5 w-3.5" />
              {audioPlaying ? "Lecture en cours…" : "Écouter le débrief"}
            </button>
            {aiLoading && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50">
                <Sparkles className="h-3 w-3 animate-pulse" />
              </span>
            )}
            {aiText && (
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/50">
                <Sparkles className="h-3 w-3" /> IA
              </span>
            )}
          </div>
        </div>

        {/* Volume */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Volume</h2>
            <span className={`text-xs font-medium ${verdictColor[debrief.volumeVerdict]}`}>
              {verdictLabel[debrief.volumeVerdict]}
            </span>
          </div>
          {volumeText && <p className="text-xs text-muted-foreground leading-relaxed animate-in fade-in duration-300">{volumeText}</p>}
          <div className="grid grid-cols-3 gap-2">
            {debrief.volumeReview.map((v) => (
              <div key={v.label} className={`rounded-lg border px-3 py-2 text-center ${v.verdict === "below" ? "border-amber-500/30 bg-amber-500/5" : v.verdict === "above" ? "border-green-500/30 bg-green-500/5" : "border-border bg-card"}`}>
                <p className="text-lg font-bold text-foreground">{v.actual}</p>
                <p className="text-[10px] text-muted-foreground">{v.label}</p>
                <p className={`text-[10px] ${v.verdict === "below" ? "text-amber-400" : v.verdict === "above" ? "text-green-400" : "text-muted-foreground"}`}>
                  obj. {v.target}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Performance */}
        {debrief.performanceReview.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Performance</h2>
            {performanceText && <p className="text-xs text-muted-foreground leading-relaxed animate-in fade-in duration-300">{performanceText}</p>}
            <div className="space-y-2">
              {debrief.performanceReview.map((r) => (
                <div key={r.ratioId} className="rounded-lg border border-border bg-card px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {r.status === "ok" ? <CheckCircle className="h-4 w-4 text-green-400" /> : r.status === "warning" ? <AlertTriangle className="h-4 w-4 text-amber-400" /> : <TrendingDown className="h-4 w-4 text-red-400" />}
                      <span className="text-sm text-foreground">{r.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-foreground">{Math.round(r.value * 10) / 10}</span>
                      <span className="text-xs text-muted-foreground ml-1">/ {r.target}</span>
                    </div>
                  </div>
                  <p className={`text-[10px] mt-1 ${r.confidence === "high" ? "text-muted-foreground/60" : r.confidence === "medium" ? "text-amber-400/60" : "text-amber-400/80"}`}>
                    {r.confidenceLabel}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Strengths */}
        {(debrief.strengths.length > 0 || strengthsText) && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Ce que tu fais bien</h2>
            {strengthsText ? (
              <p className="text-sm text-green-400">{strengthsText}</p>
            ) : (
              debrief.strengths.map((s, i) => (
                <p key={i} className="text-sm text-green-400 flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> {s}
                </p>
              ))
            )}
          </section>
        )}

        {/* Watchouts */}
        {(debrief.watchouts.length > 0 || watchoutsText) && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Ce que tu dois corriger</h2>
            {watchoutsText ? (
              <p className="text-sm text-amber-400">{watchoutsText}</p>
            ) : (
              debrief.watchouts.map((w, i) => (
                <p key={i} className="text-sm text-amber-400 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {w}
                </p>
              ))
            )}
          </section>
        )}

        {/* Next week plan */}
        {(debrief.nextWeekPlan.length > 0 || nextWeekText) && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Ton plan pour les 7 prochains jours</h2>
            {nextWeekText ? (
              <p className="text-sm text-foreground">{nextWeekText}</p>
            ) : (
              debrief.nextWeekPlan.map((a, i) => {
                const Icon = actionIcon[a.type];
                return (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                    <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">{a.text}</p>
                  </div>
                );
              })
            )}
          </section>
        )}

        {/* Closing */}
        <div className="text-center space-y-4 pt-4 border-t border-border">
          <p className="text-base font-medium text-foreground italic">{debrief.closingSentence}</p>
          <p className="text-xs text-muted-foreground">{debrief.coachingBranding}</p>
          <Link href={debrief.ctaUrl}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors">
            {debrief.ctaLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Close */}
        <button type="button" onClick={onClose}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
          Retour au dashboard
        </button>

        <div className="h-4" />
      </div>
    </div>
  );
}
