"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, FileUp, PenLine, Sparkles, ArrowLeft, Upload, Loader2 } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { createClient } from "@/lib/supabase/client";
import { ImportConfirmation } from "@/components/saisie/import-confirmation";
import { VoiceConversation } from "@/components/saisie/voice-conversation";
import { CoachingDebriefScreen } from "@/components/saisie/coaching-debrief";
import { extractFromDocument, extractFromImage } from "@/lib/saisie-ai-client";
import { convertExtractedToPeriodResults } from "@/lib/weekly-gate";
import { SAISIE_STEPS, getNextApplicableStep } from "@/lib/saisie-steps";
import { parseCountField, parseMandatsText, parseDetailsText, capitalizeFirst } from "@/lib/saisie-parser";
import type { ExtractedFields, ExtractedArrays, ExtractionResult, MandatDetail, AcheteurDetail, InfoVenteDetail } from "@/lib/saisie-ai-client";

// ─── Personas (centralized in src/lib/personas.ts) ──────────────────────────

import { PERSONA_GREETINGS, DEFAULT_PERSONA, isValidPersona, coachVoiceToPersona } from "@/lib/personas";
import type { PersonaId } from "@/lib/personas";

interface PersonaGreeting { line1: (firstName: string) => string; line2: string; }

const CONTEXT_GREETINGS: Record<string, PersonaGreeting> = {
  demo: { line1: (name) => `Bienvenue, ${name} 👋`, line2: "Découvre la saisie hebdomadaire. 2 minutes pour faire le point." },
  friday_required: { line1: (name) => `Bonne fin de semaine, ${name} 👊`, line2: "Prends 2 minutes pour faire le bilan de ta semaine." },
  monday_catchup: { line1: (name) => `${name}, ta saisie t'attend`, line2: "Tu n'as pas complété vendredi. Prends 2 minutes pour rattraper." },
};

const DEFAULT_GREETING: PersonaGreeting = {
  line1: (name) => `Bonne semaine, ${name} 👊`,
  line2: "Prends 2 minutes pour faire le point sur ta semaine.",
};

// Questions are imported from SAISIE_STEPS (shared source of truth with voice mode)

// ─── Props ───────────────────────────────────────────────────────────────────

interface WeeklyGateProps {
  onDismiss: () => void;
  onSaisieDone: () => void;
  /** Persist validated data → Supabase + store */
  saveResult: (result: import("@/types/results").PeriodResults) => Promise<unknown>;
  /** Optional context label for the welcome screen */
  context?: "demo" | "friday_required" | "monday_catchup" | "none";
}

type Screen = "welcome" | "mode" | "manual" | "voice" | "import" | "confirmation" | "debrief";

// ─── Composant ───────────────────────────────────────────────────────────────

export function WeeklyGate({ onDismiss, onSaisieDone, saveResult, context }: WeeklyGateProps) {
  const user = useAppStore((s) => s.user);
  const [screen, setScreen] = useState<Screen>("welcome");

  // Manual flow state — uses SAISIE_STEPS as source of truth
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [slideDir, setSlideDir] = useState<"right" | "left">("right");
  const [animating, setAnimating] = useState(false);
  const [detailError, setDetailError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // Track fields for conditional steps
  const manualFieldsRef = useRef<ExtractedFields>({});

  // Confirmation state
  const [extractedFields, setExtractedFields] = useState<ExtractedFields>({});
  const [extractedArrays, setExtractedArrays] = useState<ExtractedArrays>({
    mandats: [], informationsVente: [], acheteursChauds: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDesc, setConfirmDesc] = useState("");
  const [confirmUncertain, setConfirmUncertain] = useState<string[]>([]);
  const [confirmUnmapped, setConfirmUnmapped] = useState<string[]>([]);

  // Debrief state — stored after successful save
  const [savedResults, setSavedResults] = useState<import("@/types/results").PeriodResults | null>(null);

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Skip confirmation state
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const firstName = user?.firstName || "Conseiller";
  const isDemo = useAppStore((s) => s.isDemo);
  const [personaId, setPersonaId] = useState<PersonaId | null>(null);
  const [preferredInputMode, setPreferredInputMode] = useState<string>("audio_full");

  const profile = useAppStore((s) => s.profile);

  // Load persona + input_mode from Supabase, fallback to profile.coach_voice
  useEffect(() => {
    // Fallback: derive persona from profile.coach_voice if no explicit preference
    if (profile?.coach_voice && !personaId) {
      setPersonaId(coachVoiceToPersona(profile.coach_voice));
    }

    if (isDemo || !user?.id) return;
    const supabase = createClient();
    supabase
      .from("user_voice_preferences")
      .select("persona, input_mode")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.persona && isValidPersona(data.persona)) setPersonaId(data.persona);
        else if (profile?.coach_voice) setPersonaId(coachVoiceToPersona(profile.coach_voice));
        if (data?.input_mode) setPreferredInputMode(data.input_mode);
      });
  }, [user?.id, isDemo, profile?.coach_voice, personaId]);

  const contextGreeting = context ? CONTEXT_GREETINGS[context] : undefined;
  const greeting = personaId ? PERSONA_GREETINGS[personaId] : (contextGreeting ?? DEFAULT_GREETING);

  // Focus input on step change
  useEffect(() => {
    if (screen === "manual") {
      const timer = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, [screen, stepIdx]);

  // ── Build extracted data from answers (aligned with SAISIE_STEPS) ─────────

  const buildExtractedData = useCallback(() => {
    const fields: ExtractedFields = {};
    let mandatsArr: MandatDetail[] = [];
    let infosArr: InfoVenteDetail[] = [];
    let acheteursArr: AcheteurDetail[] = [];

    for (const step of SAISIE_STEPS) {
      const raw = answers[step.id] ?? "";

      if (step.inputMode === "count" || step.inputMode === "money") {
        const val = raw === "" ? 0 : (parseCountField(raw) ?? 0);
        (fields as Record<string, number>)[step.field] = val;
      } else if (step.inputMode === "detail_mandats") {
        mandatsArr = parseMandatsText(raw).map(m => ({ nomVendeur: capitalizeFirst(m.nomVendeur), type: m.type }));
      } else if (step.inputMode === "detail_infos") {
        infosArr = parseDetailsText(raw).map(d => ({ nom: capitalizeFirst(d.nom), commentaire: d.commentaire }));
      } else if (step.inputMode === "detail_acheteurs") {
        acheteursArr = parseDetailsText(raw).map(d => ({ nom: capitalizeFirst(d.nom), commentaire: d.commentaire }));
      }
    }

    return {
      fields,
      arrays: { mandats: mandatsArr, informationsVente: infosArr, acheteursChauds: acheteursArr },
    };
  }, [answers]);

  // ── Get the current applicable step ────────────────────────────────────────

  const currentStep = stepIdx < SAISIE_STEPS.length ? SAISIE_STEPS[stepIdx] : null;
  const applicableSteps = SAISIE_STEPS.filter(s => !s.condition || s.condition(manualFieldsRef.current));
  const applicableIdx = currentStep ? applicableSteps.indexOf(currentStep) : -1;
  const totalApplicable = applicableSteps.length;

  // ── Navigation ─────────────────────────────────────────────────────────────

  const processAndAdvance = () => {
    if (animating || !currentStep) return;

    const raw = answers[currentStep.id] ?? "";
    setDetailError("");

    // Parse count/money → store in ref for condition evaluation
    if (currentStep.inputMode === "count" || currentStep.inputMode === "money") {
      const val = raw === "" ? 0 : (parseCountField(raw) ?? 0);
      (manualFieldsRef.current as Record<string, number>)[currentStep.field] = val;
    }

    // Validate detail fields — reject non-exploitable input
    if (currentStep.inputMode === "detail_mandats" || currentStep.inputMode === "detail_infos" || currentStep.inputMode === "detail_acheteurs") {
      const trimmed = raw.trim();
      if (trimmed && trimmed !== "0" && trimmed.toLowerCase() !== "aucun" && trimmed.toLowerCase() !== "rien") {
        const isJustNumber = /^\d+$/.test(trimmed);
        const isJustYes = /^(oui|ok|ouais|non)$/i.test(trimmed);
        const isTooShort = trimmed.length > 0 && trimmed.length < 3 && !isJustNumber;
        if (isJustNumber || isJustYes || isTooShort) {
          setDetailError("Indique un nom + contexte, ou laisse vide.");
          return;
        }
      }
    }

    // Find next applicable step
    const nextIdx = getNextApplicableStep(stepIdx + 1, manualFieldsRef.current);

    if (nextIdx >= SAISIE_STEPS.length) {
      // Done → confirmation
      const { fields, arrays } = buildExtractedData();
      setExtractedFields(fields);
      setExtractedArrays(arrays);
      setConfirmDesc("Saisie manuelle");
      setScreen("confirmation");
      return;
    }

    setSlideDir("right");
    setAnimating(true);
    setTimeout(() => {
      setStepIdx(nextIdx);
      setAnimating(false);
    }, 200);
  };

  const goPrev = () => {
    if (animating || stepIdx <= 0) return;
    // Find previous applicable step
    let prevIdx = stepIdx - 1;
    while (prevIdx >= 0) {
      const s = SAISIE_STEPS[prevIdx];
      if (!s.condition || s.condition(manualFieldsRef.current)) break;
      prevIdx--;
    }
    if (prevIdx < 0) return;

    setDetailError("");
    setSlideDir("left");
    setAnimating(true);
    setTimeout(() => {
      setStepIdx(prevIdx);
      setAnimating(false);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      processAndAdvance();
    }
  };

  const updateAnswer = (value: string) => {
    if (!currentStep) return;
    if (detailError) setDetailError("");
    setAnswers((prev) => ({ ...prev, [currentStep.id]: value }));
  };

  const handleConfirm = async (fields: ExtractedFields, arrays: ExtractedArrays) => {
    if (!user?.id) return;
    setIsSaving(true);
    const periodResult = convertExtractedToPeriodResults(user.id, fields, arrays);
    await saveResult(periodResult);
    setSavedResults(periodResult);
    setIsSaving(false);
    setScreen("debrief");
  };

  const handleReset = () => {
    setAnswers({});
    manualFieldsRef.current = {};
    setStepIdx(0);
    setDetailError("");
    setScreen("manual");
  };

  // ── Import handler ──────────────────────────────────────────────────────

  const applyExtractionResult = (result: ExtractionResult) => {
    setExtractedFields(result.extracted);
    setExtractedArrays(result.arrays);
    setConfirmDesc(result.description);
    setConfirmUncertain(result.uncertain);
    setConfirmUnmapped(result.unmapped);
    setIsImporting(false);
    setScreen("confirmation");
  };

  const handleFileImport = async (file: File) => {
    setIsImporting(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isImage = file.type.startsWith("image/");
    const isPDF = ext === "pdf" || file.type === "application/pdf";
    const isExcel = ["xls", "xlsx", "xlsm", "ods", "csv"].includes(ext);
    const isWord = ["doc", "docx", "odt", "txt"].includes(ext);

    try {
      if (isImage || isPDF) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = (e.target?.result as string).split(",")[1];
          const mediaType = isPDF ? "application/pdf" : file.type;
          try {
            const result = await extractFromImage(base64, mediaType);
            applyExtractionResult(result);
          } catch {
            setIsImporting(false);
            setScreen("import");
          }
        };
        reader.readAsDataURL(file);
        return;
      }

      if (isExcel) {
        const XLSX = await import("xlsx");
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const csvParts: string[] = [];
        workbook.SheetNames.forEach((name) => {
          const sheet = workbook.Sheets[name];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          if (csv.trim()) csvParts.push(`[Feuille: ${name}]\n${csv}`);
        });
        const result = await extractFromDocument(csvParts.join("\n\n"), file.name);
        applyExtractionResult(result);
        return;
      }

      if (isWord) {
        let text = "";
        if (ext === "docx") {
          const mammoth = await import("mammoth");
          const arrayBuffer = await file.arrayBuffer();
          const { value } = await mammoth.extractRawText({ arrayBuffer });
          text = value;
        } else {
          text = await file.text();
        }
        const result = await extractFromDocument(text, file.name);
        applyExtractionResult(result);
        return;
      }

      // Unsupported format
      setIsImporting(false);
    } catch (err) {
      console.error("handleFileImport error:", err);
      setIsImporting(false);
    }
  };

  // ── Screens ────────────────────────────────────────────────────────────────

  const handleSkipConfirmed = async () => {
    // Notify manager if user is attached to one
    if (!isDemo && user?.managerId) {
      try {
        const supabase = createClient();
        await supabase.from("notifications").insert({
          user_id: user.managerId,
          type: "saisie_skipped",
          message: `${user.firstName} ${user.lastName} n'a pas saisi ses résultats cette semaine`,
        });
      } catch { /* notification is best-effort */ }
    }
    setShowSkipConfirm(false);
    onDismiss();
  };

  const fullscreen = "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background";
  const gradient = "pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent";
  const passBtn = (
    <button
      onClick={() => setShowSkipConfirm(true)}
      className="text-xs text-muted-foreground transition-colors hover:text-muted-foreground/70"
      style={{ fontSize: 12 }}
    >
      Passer cette semaine
    </button>
  );

  // ── Skip confirmation modal ──
  if (showSkipConfirm) {
    return (
      <div className={fullscreen}>
        <div className={gradient} />
        <div className="relative z-10 flex max-w-sm flex-col items-center gap-6 px-6 text-center">
          <h2 className="text-xl font-bold text-foreground">Passer cette semaine ?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {user?.managerId
              ? "Votre manager sera notifié que vous n'avez pas saisi vos résultats."
              : "Vous pourrez saisir vos résultats plus tard."}
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setShowSkipConfirm(false)}
              className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSkipConfirmed}
              className="flex-1 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Écran 1 : Bienvenue ──────────────────────────────────────────────────
  if (screen === "welcome") {
    return (
      <div className={fullscreen}>
        <div className={gradient} />
        <div className="relative z-10 flex max-w-md flex-col items-center gap-8 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {greeting.line1(firstName)}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              {greeting.line2}
            </p>
          </div>
          <button
            onClick={() => setScreen("mode")}
            className="w-full max-w-xs rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            Démarrer mon bilan
          </button>
          <div className="mt-4">{passBtn}</div>
        </div>
      </div>
    );
  }

  // ── Écran 2 : Sélection du mode ──────────────────────────────────────────
  if (screen === "mode") {
    return (
      <div className={fullscreen}>
        <div className={gradient} />
        <div className="relative z-10 flex max-w-lg flex-col items-center gap-10 px-6 text-center">
          <h2 className="text-xl font-bold text-foreground">
            Comment tu veux saisir ?
          </h2>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
            <button
              onClick={() => setScreen("voice")}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Mic className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">À la voix</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Guidé, 2 min</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScreen("import")}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <FileUp className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Importer un fichier</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Excel / PDF / Photo</p>
              </div>
            </button>

            <button
              onClick={() => setScreen("manual")}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <PenLine className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Saisir manuellement</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Question par question</p>
              </div>
            </button>
          </div>
          {passBtn}
        </div>
      </div>
    );
  }

  // ── Écran 3 : Saisie manuelle question par question ──────────────────────
  if (screen === "manual" && currentStep) {
    const progress = totalApplicable > 0 ? ((applicableIdx + 1) / totalApplicable) * 100 : 0;
    const isDetail = currentStep.inputMode === "detail_mandats" || currentStep.inputMode === "detail_infos" || currentStep.inputMode === "detail_acheteurs";

    return (
      <div className={fullscreen}>
        <div className={gradient} />

        <div className="relative z-10 flex w-full max-w-lg flex-col items-center px-6" style={{ minHeight: 400 }}>
          {/* Top bar : back + progress */}
          <div className="flex w-full items-center gap-3 mb-8">
            {stepIdx > 0 ? (
              <button
                type="button"
                onClick={goPrev}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <div className="w-9" />
            )}
            <div className="flex-1">
              <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
              {applicableIdx + 1} / {totalApplicable}
            </span>
          </div>

          {/* Section label */}
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">
            {currentStep.section}
          </p>

          {/* Question with slide animation */}
          <div
            className={`w-full text-center transition-all duration-200 ${
              animating
                ? slideDir === "right"
                  ? "translate-x-8 opacity-0"
                  : "-translate-x-8 opacity-0"
                : "translate-x-0 opacity-100"
            }`}
          >
            <h2 className="text-2xl font-medium text-foreground leading-snug mb-10">
              {currentStep.prompt}
            </h2>

            <input
              ref={inputRef}
              type={currentStep.keyboardMode === "numeric" ? "number" : "text"}
              min={currentStep.keyboardMode === "numeric" ? 0 : undefined}
              inputMode={currentStep.keyboardMode}
              value={answers[currentStep.id] ?? ""}
              onChange={(e) => updateAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentStep.placeholder}
              autoFocus
              className={`w-full ${isDetail ? "max-w-md" : "max-w-xs"} mx-auto block rounded-xl border border-input bg-card px-5 py-4 ${isDetail ? "text-left text-base" : "text-center text-2xl font-semibold"} text-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/40`}
            />

            {detailError && (
              <p className="mt-2 text-xs text-amber-500">{detailError}</p>
            )}

            {currentStep.exampleHint && !detailError && (
              <p className="mt-3 text-xs text-muted-foreground/60">{currentStep.exampleHint}</p>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              {isDetail ? "Entrée pour valider · Vide = aucun" : "Entrée pour continuer"}
            </p>
          </div>

          {/* Passer */}
          <div className="mt-auto pt-12">
            {passBtn}
          </div>
        </div>
      </div>
    );
  }

  // ── Écran 4 : Conversation guidée (voix/texte) ─────────────────────────
  if (screen === "voice") {
    return (
      <VoiceConversation
        persona={personaId ?? undefined}
        startInTextMode={preferredInputMode === "text_keyboard"}
        onDismiss={onDismiss}
        onComplete={(voiceFields, voiceArrays) => {
          setExtractedFields(voiceFields);
          setExtractedArrays(voiceArrays);
          setScreen("confirmation");
        }}
      />
    );
  }

  // ── Écran 5 : Import de fichier ─────────────────────────────────────────
  if (screen === "import") {
    return (
      <div className={fullscreen}>
        <div className={gradient} />
        <div className="relative z-10 flex max-w-md flex-col items-center gap-8 px-6 text-center">
          {isImporting ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium text-foreground">Analyse en cours…</p>
              <p className="text-sm text-muted-foreground">Extraction des données de votre fichier</p>
            </>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">Importer un fichier</h2>
                <p className="text-sm text-muted-foreground">
                  Excel, CSV, PDF, Word, ou photo d&apos;un tableau
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-xs flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 py-8 text-primary hover:bg-primary/10 transition-all cursor-pointer"
              >
                <FileUp className="h-8 w-8" />
                <span className="text-sm font-semibold">Choisir un fichier</span>
                <span className="text-xs text-primary/60">Image · PDF · Excel · Word</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.xls,.xlsx,.xlsm,.csv,.doc,.docx,.txt,.ods"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileImport(file);
                }}
              />
              <button
                onClick={() => setScreen("mode")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Retour
              </button>
              {passBtn}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Écran 6 : Confirmation ───────────────────────────────────────────────
  if (screen === "confirmation") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-background">
        <div className="flex-1 overflow-hidden">
          <ImportConfirmation
            extracted={extractedFields}
            arrays={extractedArrays}
            uncertain={confirmUncertain}
            unmapped={confirmUnmapped}
            description={confirmDesc || "Vérifiez et enregistrez"}
            onConfirm={handleConfirm}
            onReset={handleReset}
            isSaving={isSaving}
          />
        </div>
      </div>
    );
  }

  // ── Écran 7 : Coaching Debrief ──────────────────────────────────────────
  if (screen === "debrief" && savedResults && user) {
    return (
      <CoachingDebriefScreen
        results={savedResults}
        category={user.category}
        ratioConfigs={useAppStore.getState().ratioConfigs}
        persona={personaId ?? undefined}
        onClose={onSaisieDone}
      />
    );
  }

  return null;
}
