"use client";

import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import {
  X,
  Mic,
  MicOff,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Home,
  Users,
  DollarSign,
  Volume2,
  VolumeX,
  ChevronRight,
  RotateCcw,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVocalFlow, type SectionResult } from "@/hooks/use-vocal-flow";
import { useVocalRecorder } from "@/hooks/use-vocal-recorder";
import { mapVocalToResults } from "@/lib/vocal-mapping";
import { SECTION_ORDER, SECTION_QUESTIONS, type VocalSection } from "@/lib/vocal-prompts";
import type { PeriodResults } from "@/types/results";

// ── CSS Animations (injected once) ──

const VOCAL_STYLES = `
@keyframes vocal-pulse-ring {
  0% { transform: scale(1); opacity: 0.35; }
  100% { transform: scale(1.9); opacity: 0; }
}
@keyframes vocal-fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes vocal-progress {
  from { width: 0%; }
}
@keyframes vocal-dots {
  0%, 20% { opacity: 0; }
  50% { opacity: 1; }
  80%, 100% { opacity: 0; }
}
@keyframes vocal-check-bounce {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.15); }
  70% { transform: scale(0.95); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes vocal-ring-expand {
  0% { transform: scale(0.8); opacity: 0.5; }
  100% { transform: scale(2.5); opacity: 0; }
}
.vocal-fade-in-up { animation: vocal-fade-in-up 0.22s ease-out both; }
.vocal-pulse-ring { animation: vocal-pulse-ring 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.vocal-check-bounce { animation: vocal-check-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.vocal-ring-expand { animation: vocal-ring-expand 1.2s ease-out both; }
`;

// ── Types & constants ──

interface VocalFlowProps {
  onClose: () => void;
  onComplete?: (data: Partial<PeriodResults>) => void;
}

const SECTION_ICONS: Record<VocalSection, typeof Phone> = {
  prospection: Phone,
  vendeurs: Home,
  acheteurs: Users,
  ventes: DollarSign,
};

const SECTION_LABELS: Record<VocalSection, string> = {
  prospection: "Prospection",
  vendeurs: "Vendeurs",
  acheteurs: "Acheteurs",
  ventes: "Ventes",
};

const SECTION_COLORS: Record<VocalSection, { border: string; bg: string; text: string; dot: string }> = {
  prospection: { border: "border-blue-500/30", bg: "bg-blue-500/5", text: "text-blue-500", dot: "bg-blue-500/15" },
  vendeurs: { border: "border-emerald-500/30", bg: "bg-emerald-500/5", text: "text-emerald-500", dot: "bg-emerald-500/15" },
  acheteurs: { border: "border-violet-500/30", bg: "bg-violet-500/5", text: "text-violet-500", dot: "bg-violet-500/15" },
  ventes: { border: "border-amber-500/30", bg: "bg-amber-500/5", text: "text-amber-500", dot: "bg-amber-500/15" },
};

const FIELD_LABELS: Record<string, string> = {
  contactsTotaux: "Contacts totaux",
  rdvEstimation: "RDV estimation",
  estimationsRealisees: "Estimations réalisées",
  mandatsSignes: "Mandats signés",
  rdvSuivi: "RDV suivi",
  requalificationSimpleExclusif: "Requalif simple → exclu",
  baissePrix: "Baisses de prix",
  acheteursSortisVisite: "Acheteurs en visite",
  nombreVisites: "Nombre de visites",
  offresRecues: "Offres reçues",
  compromisSignes: "Compromis signés",
  chiffreAffairesCompromis: "CA compromis",
  actesSignes: "Actes signés",
  chiffreAffaires: "Chiffre d'affaires",
};

const SECTION_NUMERIC_FIELDS: Record<VocalSection, string[]> = {
  prospection: ["contactsTotaux", "rdvEstimation"],
  vendeurs: ["estimationsRealisees", "mandatsSignes", "rdvSuivi", "requalificationSimpleExclusif", "baissePrix"],
  acheteurs: ["acheteursSortisVisite", "nombreVisites", "offresRecues", "compromisSignes", "chiffreAffairesCompromis"],
  ventes: ["actesSignes", "chiffreAffaires"],
};

const SECTION_ARRAY_FIELDS: Record<VocalSection, string[]> = {
  prospection: [],
  vendeurs: [],
  acheteurs: [],
  ventes: [],
};

// ── Main component ──

export function VocalFlow({ onClose, onComplete }: VocalFlowProps) {
  const flow = useVocalFlow();
  const recorder = useVocalRecorder();
  const { state, currentSection, currentQuestion } = flow;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    if (state.step === "done" && onComplete) {
      onComplete(mapVocalToResults(state.results));
    }
  }, [state.step, state.results, onComplete]);

  const handleRecord = useCallback(async () => {
    if (recorder.isRecording) {
      const blob = await recorder.stopRecording();
      if (blob) {
        flow.setProcessing();
        try {
          const result = await flow.processAudio(blob);
          flow.submitSectionResult(result);
        } catch (err) {
          console.error("[vocal] Processing error:", err);
          flow.startFlow();
        }
      }
    } else {
      await recorder.startRecording();
    }
  }, [recorder, flow]);

  useEffect(() => {
    if (
      state.step === "recording" &&
      state.settings.ttsEnabled &&
      currentQuestion &&
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      const utterance = new SpeechSynthesisUtterance(currentQuestion);
      utterance.lang = "fr-FR";
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
      return () => window.speechSynthesis.cancel();
    }
  }, [state.step, state.settings.ttsEnabled, currentQuestion]);

  const completedSections = state.results.length;
  const totalSteps = SECTION_ORDER.length + 1;

  // Unique key per step for transition animation
  const stepKey = `${state.step}-${state.currentSectionIndex}`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: VOCAL_STYLES }} />
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="flex w-full flex-col rounded-t-2xl border border-border bg-card shadow-[var(--shadow-2)] sm:max-w-lg sm:rounded-[var(--radius-card)] sm:rounded-t-[var(--radius-card)]" style={{ maxHeight: "100dvh", minHeight: state.step === "recording" ? "auto" : undefined }}>
          {/* ── Header ── */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5 sm:px-6 sm:py-4">
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">NXT Vocal</h2>
              {state.step !== "intro" && state.step !== "done" && (
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {Math.min(completedSections + 1, SECTION_ORDER.length)}/{totalSteps}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {state.step !== "done" && (
                <button
                  onClick={() => flow.updateSettings({ ttsEnabled: !state.settings.ttsEnabled })}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title={state.settings.ttsEnabled ? "Désactiver la lecture vocale" : "Activer la lecture vocale"}
                >
                  {state.settings.ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
              )}
              <button
                onClick={onClose}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Progress dots ── */}
          {state.step !== "intro" && state.step !== "done" && (
            <div className="flex items-center justify-center gap-2 border-b border-border px-6 py-3">
              {SECTION_ORDER.map((sec, idx) => {
                const isDone = idx < completedSections;
                const isCurrent = idx === state.currentSectionIndex;
                const Icon = SECTION_ICONS[sec];
                const colors = SECTION_COLORS[sec];
                return (
                  <div key={sec} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300",
                        isDone && "bg-green-500/15 text-green-500",
                        isCurrent && cn(colors.dot, colors.text),
                        !isDone && !isCurrent && "bg-muted text-muted-foreground"
                      )}
                    >
                      {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    {idx < SECTION_ORDER.length - 1 && (
                      <div className={cn("h-0.5 w-6 rounded-full transition-colors duration-300", idx < completedSections ? "bg-green-500/40" : "bg-border")} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6" style={{ maxHeight: "calc(100dvh - 130px)" }}>
            <div key={stepKey} className="vocal-fade-in-up">
              {state.step === "intro" && (
                <IntroScreen
                  ttsEnabled={state.settings.ttsEnabled}
                  realtimeFeedback={state.settings.realtimeFeedback}
                  onToggleTts={() => flow.updateSettings({ ttsEnabled: !state.settings.ttsEnabled })}
                  onToggleFeedback={() => flow.updateSettings({ realtimeFeedback: !state.settings.realtimeFeedback })}
                  onStart={flow.startFlow}
                />
              )}
              {state.step === "recording" && currentSection && (
                <RecordingScreen
                  section={currentSection}
                  question={currentQuestion!}
                  isRecording={recorder.isRecording}
                  recorderError={recorder.error}
                  onRecord={handleRecord}
                />
              )}
              {state.step === "processing" && <ProcessingScreen />}
              {state.step === "confirm_null" && currentSection && (
                <ConfirmNullScreen section={currentSection} onConfirm={flow.nextSection} onRetry={() => flow.startFlow()} />
              )}
              {state.step === "clarification" && (
                <ClarificationScreen result={state.results[state.results.length - 1]} onUpdateResult={flow.updateLastResult} onContinue={flow.nextSection} />
              )}
              {state.step === "review" && (
                <ReviewScreen result={state.results[state.results.length - 1]} isLast={flow.isLastSection} onUpdateResult={flow.updateLastResult} onNext={flow.nextSection} />
              )}
              {state.step === "recap" && (
                <RecapScreen results={state.results} onConfirm={flow.confirmAll} onRestart={flow.reset} />
              )}
              {state.step === "done" && <DoneScreen results={state.results} onClose={onClose} onReset={flow.reset} />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Sub-screens ──

function IntroScreen({
  ttsEnabled,
  realtimeFeedback,
  onToggleTts,
  onToggleFeedback,
  onStart,
}: {
  ttsEnabled: boolean;
  realtimeFeedback: boolean;
  onToggleTts: () => void;
  onToggleFeedback: () => void;
  onStart: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mic className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Bilan vocal</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Dictez votre bilan d&apos;activité en 4 étapes. NXT transcrit et structure vos données automatiquement.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <h4 className="text-sm font-medium text-foreground">Préférences</h4>
        <ToggleRow label="NXT lit les questions à voix haute" value={ttsEnabled} onToggle={onToggleTts} />
        <ToggleRow label="Voir les données après chaque section" value={realtimeFeedback} onToggle={onToggleFeedback} />
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Les 4 sections</h4>
        {SECTION_ORDER.map((sec) => {
          const Icon = SECTION_ICONS[sec];
          const colors = SECTION_COLORS[sec];
          return (
            <div key={sec} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2", colors.border, colors.bg)}>
              <Icon className={cn("h-4 w-4", colors.text)} />
              <span className="text-sm text-foreground">{SECTION_QUESTIONS[sec]}</span>
            </div>
          );
        })}
      </div>

      <button
        onClick={onStart}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:brightness-110"
      >
        <Mic className="h-4 w-4" />
        Commencer le bilan
      </button>
    </div>
  );
}

function RecordingScreen({
  section,
  question,
  isRecording,
  recorderError,
  onRecord,
}: {
  section: VocalSection;
  question: string;
  isRecording: boolean;
  recorderError: string | null;
  onRecord: () => void;
}) {
  const Icon = SECTION_ICONS[section];
  const colors = SECTION_COLORS[section];
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRecording) {
      setSeconds(0);
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setSeconds(0);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRecording]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className={cn("flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium", colors.bg, colors.text)}>
        <Icon className="h-4 w-4" />
        {SECTION_LABELS[section]}
      </div>

      <p className="text-center text-base font-medium text-foreground">{question}</p>

      {recorderError && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {recorderError}
        </div>
      )}

      {/* Mic button with pulse rings */}
      <div className="relative flex items-center justify-center">
        {isRecording && (
          <>
            <div className="vocal-pulse-ring absolute h-20 w-20 rounded-full border-2 border-red-400/40" style={{ animationDelay: "0s" }} />
            <div className="vocal-pulse-ring absolute h-20 w-20 rounded-full border-2 border-red-400/30" style={{ animationDelay: "0.4s" }} />
            <div className="vocal-pulse-ring absolute h-20 w-20 rounded-full border-2 border-red-400/20" style={{ animationDelay: "0.8s" }} />
          </>
        )}
        <button
          onClick={onRecord}
          className={cn(
            "relative z-10 flex h-20 w-20 items-center justify-center rounded-full transition-all duration-200",
            isRecording
              ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
              : "bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:brightness-110"
          )}
        >
          {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
        </button>
      </div>

      {isRecording ? (
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-lg font-semibold tabular-nums text-red-500">{formatTime(seconds)}</span>
          <p className="text-xs text-muted-foreground">Appuyez pour arrêter</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Appuyez pour commencer à dicter</p>
      )}
    </div>
  );
}

function ProcessingScreen() {
  const [phase, setPhase] = useState<"transcription" | "extraction">("transcription");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Phase 1: transcription 0-50%
    const t1 = setInterval(() => {
      setProgress((p) => {
        if (p >= 50 && phase === "transcription") return p;
        if (p >= 100) return 100;
        return p + 2;
      });
    }, 60);

    // Switch to phase 2 after 1.5s
    const t2 = setTimeout(() => {
      setPhase("extraction");
      setProgress(50);
      const t3 = setInterval(() => {
        setProgress((p) => {
          if (p >= 95) { clearInterval(t3); return 95; }
          return p + 1.5;
        });
      }, 80);
    }, 1500);

    return () => { clearInterval(t1); clearTimeout(t2); };
  }, [phase]);

  return (
    <div className="flex flex-col items-center gap-5 py-10">
      <div className="relative h-12 w-12">
        <svg className="h-12 w-12 animate-spin" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" strokeWidth="3" className="stroke-muted" />
          <circle
            cx="24" cy="24" r="20" fill="none" strokeWidth="3"
            strokeDasharray="126" strokeDashoffset={126 - (126 * Math.min(progress, 100)) / 100}
            strokeLinecap="round" className="stroke-primary transition-all duration-300"
            transform="rotate(-90 24 24)"
          />
        </svg>
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {phase === "transcription" ? "Transcription en cours" : "Analyse des données"}
          <span className="inline-flex w-6">
            <span className="animate-pulse">...</span>
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {phase === "transcription" ? "Conversion de la voix en texte" : "Extraction des chiffres et des noms"}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-48 overflow-hidden rounded-full bg-muted" style={{ height: 4 }}>
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function ConfirmNullScreen({
  section,
  onConfirm,
  onRetry,
}: {
  section: VocalSection;
  onConfirm: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
        <AlertTriangle className="h-7 w-7 text-amber-500" />
      </div>
      <div className="text-center">
        <p className="text-base font-medium text-foreground">
          Aucune activité en {SECTION_LABELS[section]}, c&apos;est bien ça ?
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Si vous avez des données à saisir, vous pouvez réenregistrer.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-[var(--radius-button)] border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" />
          Réenregistrer
        </button>
        <button
          onClick={onConfirm}
          className="flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
        >
          <ChevronRight className="h-4 w-4" />
          Confirmer et passer
        </button>
      </div>
    </div>
  );
}

function ClarificationScreen({
  result,
  onUpdateResult,
  onContinue,
}: {
  result: SectionResult;
  onUpdateResult: (r: SectionResult) => void;
  onContinue: () => void;
}) {
  const Icon = SECTION_ICONS[result.section];
  const colors = SECTION_COLORS[result.section];
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const handleApplyAndContinue = () => {
    const updatedExtracted = { ...result.extracted };
    for (const [idxStr, answer] of Object.entries(answers)) {
      const nc = result.needsClarification[Number(idxStr)];
      if (!nc || !answer.trim()) continue;

      const mandatTypeMatch = nc.field.match(/^mandatsTypes\[(\d+)\]$/);
      if (mandatTypeMatch) {
        const mandatIdx = Number(mandatTypeMatch[1]);
        const types = [
          ...((updatedExtracted.mandatsTypes as Array<"simple" | "exclusif">) || []),
        ];
        const normalized = answer.toLowerCase().trim();
        types[mandatIdx] = normalized.includes("exclusif") ? "exclusif" : "simple";
        updatedExtracted.mandatsTypes = types;
      } else {
        updatedExtracted[nc.field] = answer.trim();
      }
    }

    const remainingClarifications = result.needsClarification.filter(
      (_, i) => !answers[i] || !answers[i].trim()
    );

    onUpdateResult({ ...result, extracted: updatedExtracted, needsClarification: remainingClarifications });
    onContinue();
  };

  return (
    <div className="space-y-5">
      <div className={cn("flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium w-fit", colors.bg, colors.text)}>
        <Icon className="h-4 w-4" />
        {SECTION_LABELS[result.section]} — Précisions
      </div>

      <p className="text-sm text-muted-foreground">Quelques points nécessitent une précision :</p>

      <div className="space-y-3">
        {result.needsClarification.map((nc, i) => (
          <div key={i} className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
            <p className="text-sm font-medium text-foreground">{nc.question}</p>
            <input
              type="text"
              placeholder="Votre réponse..."
              value={answers[i] || ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
              className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:text-sm"
            />
          </div>
        ))}
      </div>

      <ReadOnlyDataDisplay extracted={result.extracted} />

      <button
        onClick={handleApplyAndContinue}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
      >
        Continuer
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ReviewScreen({
  result,
  isLast,
  onUpdateResult,
  onNext,
}: {
  result: SectionResult;
  isLast: boolean;
  onUpdateResult: (r: SectionResult) => void;
  onNext: () => void;
}) {
  const Icon = SECTION_ICONS[result.section];
  const colors = SECTION_COLORS[result.section];
  const [editData, setEditData] = useState<Record<string, unknown>>(() => ({ ...result.extracted }));

  const handleNumericChange = (field: string, value: string) => {
    const num = value === "" ? null : Number(value);
    setEditData((prev) => ({ ...prev, [field]: num }));
  };

  const handleArrayItemChange = (arrayField: string, index: number, subField: string, value: string) => {
    setEditData((prev) => {
      const arr = [...((prev[arrayField] as Array<Record<string, unknown>>) || [])];
      arr[index] = { ...arr[index], [subField]: value };
      return { ...prev, [arrayField]: arr };
    });
  };

  const handleAddArrayItem = (arrayField: string) => {
    setEditData((prev) => {
      const arr = [...((prev[arrayField] as Array<Record<string, unknown>>) || [])];
      arr.push({ nom: "", commentaire: "" });
      return { ...prev, [arrayField]: arr };
    });
  };

  const handleRemoveArrayItem = (arrayField: string, index: number) => {
    setEditData((prev) => {
      const arr = [...((prev[arrayField] as Array<Record<string, unknown>>) || [])];
      arr.splice(index, 1);
      return { ...prev, [arrayField]: arr };
    });
  };

  const handleNext = () => {
    onUpdateResult({ ...result, extracted: { ...editData } });
    onNext();
  };

  const numericFields = SECTION_NUMERIC_FIELDS[result.section];
  const arrayFields = SECTION_ARRAY_FIELDS[result.section];

  return (
    <div className="space-y-5">
      <div className={cn("flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium w-fit", colors.bg, colors.text)}>
        <Icon className="h-4 w-4" />
        {SECTION_LABELS[result.section]} — Vérification
      </div>

      {/* Transcription */}
      <div className={cn("rounded-lg border-l-2 px-4 py-3", colors.border, "bg-muted/30")}>
        <p className="text-xs font-medium text-muted-foreground mb-1">Transcription</p>
        <p className="text-sm text-foreground italic">&quot;{result.transcript}&quot;</p>
      </div>

      {/* Numeric fields — grid 2 cols on sm+ */}
      <div className="rounded-lg border border-border p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {numericFields.map((field) => {
            const val = editData[field];
            if (val === undefined) return null;
            const label = FIELD_LABELS[field] || field;
            return (
              <div key={field} className="flex items-center justify-between gap-2 sm:flex-col sm:items-start">
                <span className="text-xs text-muted-foreground">{label}</span>
                <input
                  type="number"
                  min={0}
                  value={val === null ? "" : String(val)}
                  onChange={(e) => handleNumericChange(field, e.target.value)}
                  placeholder="—"
                  className="w-20 rounded-md border border-border bg-card px-2 py-1.5 text-right text-base font-medium text-primary focus:border-primary focus:outline-none sm:w-full sm:text-left sm:text-sm"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Array fields */}
      {arrayFields.map((arrayField) => {
        const items = (editData[arrayField] as Array<Record<string, unknown>>) || [];
        const label = FIELD_LABELS[arrayField] || arrayField;

        return (
          <div key={arrayField}>
            <div className="border-t border-border mt-1 pt-3" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
              <button
                onClick={() => handleAddArrayItem(arrayField)}
                className="flex items-center gap-1 rounded-md border border-dashed border-border px-2.5 py-1 text-xs text-primary transition-colors hover:bg-primary/5"
              >
                <Plus className="h-3 w-3" />
                Ajouter
              </button>
            </div>
            {items.length === 0 && (
              <p className="text-xs italic text-muted-foreground">Aucun élément</p>
            )}
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 rounded-lg bg-muted/30 p-3">
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={String(item.nom || "")}
                      onChange={(e) => handleArrayItemChange(arrayField, idx, "nom", e.target.value)}
                      placeholder="Nom"
                      className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:text-sm"
                    />
                    <input
                      type="text"
                      value={String(item.commentaire || "")}
                      onChange={(e) => handleArrayItemChange(arrayField, idx, "commentaire", e.target.value)}
                      placeholder="Commentaire"
                      className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:text-sm"
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveArrayItem(arrayField, idx)}
                    className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <button
        onClick={handleNext}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
      >
        {isLast ? "Voir le récapitulatif" : "Section suivante"}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function RecapScreen({
  results,
  onConfirm,
  onRestart,
}: {
  results: SectionResult[];
  onConfirm: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">Récapitulatif</h3>
        <p className="mt-1 text-sm text-muted-foreground">Vérifiez vos données avant validation</p>
      </div>

      <div className="space-y-3">
        {SECTION_ORDER.map((sec) => {
          const result = results.find((r) => r.section === sec);
          const Icon = SECTION_ICONS[sec];
          const colors = SECTION_COLORS[sec];

          return (
            <div key={sec} className={cn("rounded-xl border border-border border-l-2 p-4", colors.border)}>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-full", colors.dot)}>
                    <Icon className={cn("h-3.5 w-3.5", colors.text)} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{SECTION_LABELS[sec]}</span>
                </div>
                {result && !result.allNull ? (
                  <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-600">
                    <Check className="h-3 w-3" />
                    Confirmé
                  </span>
                ) : result?.allNull ? (
                  <span className="text-xs italic text-muted-foreground">Aucune activité</span>
                ) : null}
              </div>
              {result && !result.allNull ? (
                <ReadOnlyDataDisplay extracted={result.extracted} compact />
              ) : !result ? (
                <p className="text-xs italic text-muted-foreground">Section non renseignée</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRestart}
          className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-button)] border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" />
          Recommencer
        </button>
        <button
          onClick={onConfirm}
          className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-green-700"
        >
          <CheckCircle2 className="h-4 w-4" />
          Valider et enregistrer
        </button>
      </div>
    </div>
  );
}

function DoneScreen({
  results,
  onClose,
  onReset,
}: {
  results: SectionResult[];
  onClose: () => void;
  onReset: () => void;
}) {
  const dataCount = useMemo(() => {
    let count = 0;
    for (const r of results) {
      if (r.allNull) continue;
      for (const [key, val] of Object.entries(r.extracted)) {
        if (key === "needs_clarification" || key === "all_null") continue;
        if (val === null || val === undefined) continue;
        if (Array.isArray(val)) { count += val.length; } else { count++; }
      }
    }
    return count;
  }, [results]);

  return (
    <div className="flex flex-col items-center gap-6 py-10">
      {/* Animated check */}
      <div className="relative">
        <div className="vocal-ring-expand absolute inset-0 rounded-full bg-green-500/10" style={{ animationDelay: "0.1s" }} />
        <div className="vocal-ring-expand absolute inset-0 rounded-full bg-green-500/5" style={{ animationDelay: "0.3s" }} />
        <div className="vocal-check-bounce flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">Bilan enregistré avec succès</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {dataCount} donnée{dataCount > 1 ? "s" : ""} enregistrée{dataCount > 1 ? "s" : ""} dans le formulaire
        </p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:gap-3">
        <button
          onClick={() => { onReset(); }}
          className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-button)] border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Mic className="h-4 w-4" />
          Nouveau bilan
        </button>
        <button
          onClick={onClose}
          className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:brightness-110"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

// ── Shared components ──

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <button
        onClick={onToggle}
        className={cn("relative h-6 w-11 rounded-full transition-colors", value ? "bg-primary" : "bg-muted")}
      >
        <span className={cn("absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform", value && "translate-x-5")} />
      </button>
    </label>
  );
}

function ReadOnlyDataDisplay({
  extracted,
  compact = false,
}: {
  extracted: Record<string, unknown>;
  compact?: boolean;
}) {
  const entries = Object.entries(extracted).filter(
    ([key]) => !["needs_clarification", "all_null"].includes(key)
  );

  if (entries.length === 0) return null;

  return (
    <div className={cn("space-y-1.5", !compact && "rounded-lg border border-border p-3")}>
      {entries.map(([key, value]) => {
        if (value === null || value === undefined) return null;
        const label = FIELD_LABELS[key] || key;

        if (Array.isArray(value)) {
          if (value.length === 0) return null;
          return (
            <div key={key}>
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              {value.map((item, i) => (
                <p key={i} className="ml-3 text-sm text-foreground">
                  {typeof item === "object"
                    ? Object.values(item as Record<string, unknown>).filter(Boolean).join(" — ")
                    : String(item)}
                </p>
              ))}
            </div>
          );
        }

        return (
          <div key={key} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className={cn("text-sm font-medium", compact ? "text-foreground" : "text-primary")}>
              {typeof value === "number" && key === "chiffreAffaires"
                ? `${value.toLocaleString("fr-FR")} €`
                : String(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
