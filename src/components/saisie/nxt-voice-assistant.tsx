"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic, MicOff, X, Volume2, VolumeX, CheckCircle, Loader2,
  Upload, Sparkles, Phone, Home, Users, DollarSign,
  ChevronRight, ChevronLeft, Pencil, RotateCcw, AlertCircle
} from "lucide-react";
import { extractFromText, extractFromImage, speak, stopSpeaking, type ExtractedFields } from "@/lib/saisie-ai-client";

// ─── Types ────────────────────────────────────────────────────────────────────

type AssistantScreen = "start" | "guided" | "import_preview" | "confirmation" | "done";
type InputMode = "voice" | "text";

interface SectionDef {
  id: string;
  title: string;
  icon: React.FC<{ className?: string }>;
  question: string;
  fields: (keyof ExtractedFields)[];
}

interface NxtVoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onFieldsExtracted: (fields: ExtractedFields) => void;
  currentFields?: Partial<ExtractedFields>;
  isMandatory?: boolean;
}

// ─── Sections guidées ─────────────────────────────────────────────────────────

const SECTIONS: SectionDef[] = [
  {
    id: "prospection",
    title: "Prospection",
    icon: Phone,
    question: "Pour la prospection, donnez-moi vos chiffres : contacts entrants, contacts totaux, et RDV estimations pris.",
    fields: ["contactsEntrants", "contactsTotaux", "rdvEstimation"],
  },
  {
    id: "vendeurs",
    title: "Estimations & Mandats",
    icon: Home,
    question: "Pour les vendeurs : estimations réalisées, mandats signés, RDV de suivi vendeurs, requalifications et baisses de prix obtenues.",
    fields: ["estimationsRealisees", "mandatsSignes", "rdvSuivi", "requalification", "baissePrix"],
  },
  {
    id: "acheteurs",
    title: "Acheteurs & Visites",
    icon: Users,
    question: "Pour les acheteurs : acheteurs chauds en portefeuille, acheteurs sortis en visite, nombre de visites réalisées, offres reçues et compromis signés.",
    fields: ["acheteursChaudsCount", "acheteursSortisVisite", "nombreVisites", "offresRecues", "compromisSignes"],
  },
  {
    id: "ventes",
    title: "Ventes & CA",
    icon: DollarSign,
    question: "Pour les ventes : nombre d'actes signés chez le notaire et chiffre d'affaires en euros.",
    fields: ["actesSignes", "chiffreAffaires"],
  },
];

const FIELD_LABELS: Record<keyof ExtractedFields, string> = {
  contactsEntrants:      "Contacts entrants",
  contactsTotaux:        "Contacts totaux",
  rdvEstimation:         "RDV estimations",
  estimationsRealisees:  "Estimations réalisées",
  mandatsSignes:         "Mandats signés",
  rdvSuivi:              "RDV suivi vendeurs",
  requalification:       "Requalifications",
  baissePrix:            "Baisses de prix",
  acheteursChaudsCount:  "Acheteurs chauds",
  acheteursSortisVisite: "Acheteurs sortis en visite",
  nombreVisites:         "Visites réalisées",
  offresRecues:          "Offres reçues",
  compromisSignes:       "Compromis signés",
  actesSignes:           "Actes signés",
  chiffreAffaires:       "Chiffre d'affaires (€)",
};

// ─── Composant principal ──────────────────────────────────────────────────────

export function NxtVoiceAssistant({
  isOpen,
  onClose,
  onFieldsExtracted,
  currentFields = {},
  isMandatory = false,
}: NxtVoiceAssistantProps) {

  // Navigation
  const [screen, setScreen]           = useState<AssistantScreen>("start");
  const [inputMode, setInputMode]     = useState<InputMode>("voice");
  const [sectionIdx, setSectionIdx]   = useState(0);

  // Données extraites (accumulées au fil des sections)
  const [extracted, setExtracted]     = useState<ExtractedFields>({});
  // Champs en attente de confirmation (éditables)
  const [confirmed, setConfirmed]     = useState<ExtractedFields>({});
  // Source de l'import (description de l'image)
  const [importDesc, setImportDesc]   = useState("");

  // UI états
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [voiceMuted, setVoiceMuted]   = useState(false);
  const [transcript, setTranscript]   = useState("");
  const [textInput, setTextInput]     = useState("");
  const [aiMessage, setAiMessage]     = useState("");
  const [correctionText, setCorrectionText] = useState("");
  const [correctionRecording, setCorrectionRecording] = useState(false);
  const [sectionMissing, setSectionMissing] = useState<(keyof ExtractedFields)[]>([]);

  // Refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef   = useRef<any>(null);
  const fileInputRef     = useRef<HTMLInputElement>(null);
  const textInputRef     = useRef<HTMLTextAreaElement>(null);

  // suppress unused vars
  void currentFields;
  void textInputRef;

  // ── Reset à l'ouverture ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setScreen("start");
    setSectionIdx(0);
    setExtracted({});
    setConfirmed({});
    setAiMessage("");
    setTextInput("");
    setTranscript("");
    setIsRecording(false);
    setIsProcessing(false);
    setSectionMissing([]);
  }, [isOpen]);

  // ── Synthèse vocale ─────────────────────────────────────────────────────────
  const sayMessage = useCallback((text: string, onEnd?: () => void) => {
    setAiMessage(text);
    if (!voiceMuted) {
      setIsSpeaking(true);
      speak(text, () => { setIsSpeaking(false); onEnd?.(); });
    } else {
      onEnd?.();
    }
  }, [voiceMuted]);

  // ── Démarrage d'une section guidée ─────────────────────────────────────────
  const startSection = useCallback((idx: number) => {
    setSectionIdx(idx);
    setSectionMissing([]);
    setTextInput("");
    setTranscript("");
    const section = SECTIONS[idx];
    sayMessage(section.question);
  }, [sayMessage]);

  const beginGuided = (mode: InputMode) => {
    setInputMode(mode);
    setScreen("guided");
    setExtracted({});
    startSection(0);
  };

  // ── Traitement d'une réponse (voix ou texte) ────────────────────────────────
  const handleSectionAnswer = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);

    const section = SECTIONS[sectionIdx];
    const result = await extractFromText(text, { ...extracted });

    const newExtracted = { ...extracted, ...result.extracted };
    setExtracted(newExtracted);

    // Champs manquants de cette section
    const missing = section.fields.filter(f => newExtracted[f] === undefined || newExtracted[f] === null);
    setSectionMissing(missing);
    setIsProcessing(false);

    if (missing.length > 0) {
      const missingLabels = missing.map(f => FIELD_LABELS[f]).join(", ");
      sayMessage(`Il me manque encore : ${missingLabels}. Vous pouvez me le dire ou renseigner directement ci-dessous.`);
    } else {
      goNextSection(newExtracted);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIdx, extracted, sayMessage]);

  const goNextSection = useCallback((acc: ExtractedFields) => {
    setSectionMissing([]);
    if (sectionIdx < SECTIONS.length - 1) {
      const nextIdx = sectionIdx + 1;
      setSectionIdx(nextIdx);
      setSectionMissing([]);
      setTextInput("");
      setTranscript("");
      sayMessage(SECTIONS[nextIdx].question);
    } else {
      const toConfirm = { ...acc };
      setConfirmed(toConfirm);
      setScreen("confirmation");
      sayMessage("Voici les données que j'ai relevées. Vérifiez et corrigez si nécessaire avant de valider.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIdx, sayMessage]);

  const goPrevSection = () => {
    if (sectionIdx > 0) startSection(sectionIdx - 1);
  };

  // ── Enregistrement vocal ────────────────────────────────────────────────────
  const startRecording = useCallback((onResult: (t: string) => void) => {
    stopSpeaking();
    setIsSpeaking(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      sayMessage("La reconnaissance vocale n'est pas disponible. Utilisez Chrome ou Edge.");
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);
      if (result.isFinal) {
        setTranscript("");
        onResult(text);
      }
    };
    recognition.onend = () => { setIsRecording(false); setCorrectionRecording(false); };
    recognition.onerror = () => { setIsRecording(false); setCorrectionRecording(false); };
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [sayMessage]);

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setCorrectionRecording(false);
  };

  // ── Import image ────────────────────────────────────────────────────────────
  const handleImageImport = async (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp";
      try {
        const result = await extractFromImage(base64, mediaType);
        setExtracted(result.extracted);
        setConfirmed(result.extracted);
        setImportDesc(result.description || "Document analysé");
        setScreen("import_preview");
        sayMessage(`J'ai analysé votre document. ${result.description || ""} Vérifiez les données extraites et corrigez si nécessaire.`);
      } catch {
        sayMessage("Je n'ai pas pu lire ce document. Essayez avec une image plus nette.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Correction dans l'écran de confirmation ─────────────────────────────────
  const handleCorrectionSubmit = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    const result = await extractFromText(text, confirmed);
    const updated = { ...confirmed, ...result.extracted };
    setConfirmed(updated);
    setCorrectionText("");
    setIsProcessing(false);
    if (Object.keys(result.extracted).length > 0) {
      const names = Object.keys(result.extracted).map(k => FIELD_LABELS[k as keyof ExtractedFields]).join(", ");
      sayMessage(`J'ai mis à jour : ${names}.`);
    } else {
      sayMessage("Je n'ai pas compris la correction. Vous pouvez aussi modifier directement les chiffres.");
    }
  };

  // ── Validation finale ───────────────────────────────────────────────────────
  const handleConfirm = () => {
    onFieldsExtracted(confirmed);
    setScreen("done");
    sayMessage("Parfait ! Vos données ont été appliquées. Pensez à sauvegarder votre saisie.");
    setTimeout(() => { if (!isMandatory) onClose(); }, 2500);
  };

  if (!isOpen) return null;

  // ─── Styles communs ──────────────────────────────────────────────────────────
  const btnPrimary = "flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors";
  const btnSecondary = "flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors";
  const btnMic = (active: boolean) => `flex h-14 w-14 items-center justify-center rounded-full transition-all shadow-lg ${
    active ? "bg-red-500 text-white scale-110 animate-pulse shadow-red-500/30"
           : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
  }`;

  // ─── Écran succès ────────────────────────────────────────────────────────────
  const renderDone = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle className="h-7 w-7 text-green-500" />
      </div>
      <h2 className="text-lg font-bold text-foreground">Données appliquées</h2>
      <p className="text-sm text-muted-foreground">Pensez à sauvegarder votre saisie.</p>
    </div>
  );

  // ─── Écran d'accueil ─────────────────────────────────────────────────────────
  const renderStart = () => (
    <div className="p-6 space-y-3">
      <p className="text-center text-sm text-muted-foreground mb-4">
        Comment voulez-vous renseigner votre activité ?
      </p>
      <button onClick={() => beginGuided("voice")} className={btnPrimary + " w-full"}>
        <Mic className="h-4 w-4" />
        Saisie guidée par la voix
      </button>
      <button onClick={() => beginGuided("text")} className={btnSecondary + " w-full"}>
        <Pencil className="h-4 w-4" />
        Saisie guidée par texte
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-4 text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
      >
        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
        <span className="text-sm font-medium">Importer un document</span>
        <span className="text-xs text-primary/70">Capture d'écran, tableau, notes manuscrites</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleImageImport(e.target.files[0])}
      />
    </div>
  );

  // ─── Écran guidé ─────────────────────────────────────────────────────────────
  const renderGuided = () => {
    const section = SECTIONS[sectionIdx];
    const SectionIcon = section.icon;
    const sectionExtracted = section.fields.reduce((acc, f) => {
      if (extracted[f] !== undefined) acc[f] = extracted[f];
      return acc;
    }, {} as ExtractedFields);
    const hasAnswer = Object.keys(sectionExtracted).length > 0;

    return (
      <div className="flex flex-col gap-0 h-full">
        {/* Progress */}
        <div className="px-4 pt-2 pb-3">
          <div className="flex items-center gap-2 mb-2">
            {SECTIONS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  i < sectionIdx ? "bg-green-500 text-white"
                  : i === sectionIdx ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
                }`}>
                  {i < sectionIdx ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < SECTIONS.length - 1 && <div className={`h-0.5 flex-1 w-6 ${i < sectionIdx ? "bg-green-500" : "bg-border"}`} />}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <SectionIcon className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{section.title}</span>
            <span className="text-xs text-muted-foreground">{sectionIdx + 1} / {SECTIONS.length}</span>
          </div>
        </div>

        {/* Question IA */}
        <div className="mx-4 mb-3 rounded-xl bg-muted px-4 py-3">
          <p className="text-sm text-foreground">{aiMessage || section.question}</p>
        </div>

        {/* Champs extraits pour cette section */}
        {hasAnswer && (
          <div className="mx-4 mb-3 rounded-xl border border-green-500/20 bg-green-500/5 p-3">
            <p className="text-xs font-medium text-green-600 mb-2">Extrait :</p>
            <div className="grid grid-cols-2 gap-1.5">
              {section.fields.map(f => (
                <div key={f} className="flex items-center justify-between rounded-lg bg-background px-2 py-1.5">
                  <span className="text-xs text-muted-foreground truncate pr-1">{FIELD_LABELS[f]}</span>
                  <span className={`text-xs font-bold ${extracted[f] !== undefined ? "text-green-600" : "text-muted-foreground/40"}`}>
                    {extracted[f] !== undefined ? (f === "chiffreAffaires" ? `${extracted[f]?.toLocaleString("fr-FR")}€` : extracted[f]) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Champs manquants */}
        {sectionMissing.length > 0 && (
          <div className="mx-4 mb-2 flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-amber-600">Champs manquants :</p>
              <p className="text-xs text-amber-700">{sectionMissing.map(f => FIELD_LABELS[f]).join(", ")}</p>
            </div>
          </div>
        )}

        {/* Saisie texte */}
        {inputMode === "text" && (
          <div className="mx-4 mb-3">
            <textarea
              ref={textInputRef}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSectionAnswer(textInput); setTextInput(""); } }}
              placeholder="Tapez votre réponse… (Entrée pour valider)"
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              rows={2}
            />
          </div>
        )}

        {/* Transcript en cours */}
        {transcript && (
          <div className="mx-4 mb-2 rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary italic">{transcript}…</div>
        )}

        {/* Contrôles */}
        <div className="mt-auto px-4 pb-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={goPrevSection}
              disabled={sectionIdx === 0}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {inputMode === "voice" ? (
              <button
                onClick={() => isRecording ? stopRecording() : startRecording((t) => handleSectionAnswer(t))}
                disabled={isProcessing}
                className={btnMic(isRecording)}
              >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            ) : (
              <button
                onClick={() => { handleSectionAnswer(textInput); setTextInput(""); }}
                disabled={isProcessing || !textInput.trim()}
                className={btnMic(false) + " disabled:opacity-40"}
              >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
              </button>
            )}

            <button
              onClick={() => goNextSection(extracted)}
              className="flex h-10 items-center gap-1 rounded-full border border-border px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Passer <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {isRecording ? "Parlez… cliquez pour arrêter" : inputMode === "voice" ? "Cliquez sur le micro pour répondre" : "Tapez votre réponse et appuyez sur Entrée"}
          </p>
        </div>
      </div>
    );
  };

  // ─── Écran confirmation (partagé avec import preview) ───────────────────────
  const renderConfirmation = (isImport = false) => (
    <div className="flex flex-col gap-0 h-full">
      {/* Header confirmation */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-foreground">
          {isImport ? `📎 ${importDesc}` : "Récapitulatif de votre saisie"}
        </p>
        <p className="text-xs text-muted-foreground">Vérifiez et corrigez si nécessaire</p>
      </div>

      {/* Champs éditables */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 min-h-0">
        {SECTIONS.map(section => {
          const SectionIcon = section.icon;
          return (
            <div key={section.id} className="mb-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <SectionIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{section.title}</span>
              </div>
              <div className="space-y-1">
                {section.fields.map(f => (
                  <div key={f} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                    <span className="text-xs text-foreground flex-1 mr-2">{FIELD_LABELS[f]}</span>
                    <input
                      type="number"
                      min={0}
                      value={confirmed[f] ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? undefined : Number(e.target.value);
                        setConfirmed(prev => {
                          const next = { ...prev };
                          if (val === undefined) delete next[f];
                          else (next as Record<string, number>)[f] = val;
                          return next;
                        });
                      }}
                      placeholder="—"
                      className="w-20 rounded-md border border-input bg-muted px-2 py-1 text-right text-sm font-semibold text-foreground outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Correction IA */}
      <div className="px-4 py-3 border-t border-border space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Corriger avec l'IA :</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={correctionText}
            onChange={(e) => setCorrectionText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { handleCorrectionSubmit(correctionText); } }}
            placeholder="Ex : les compromis c'est 3 pas 2"
            className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => correctionRecording
              ? stopRecording()
              : startRecording((t) => { setCorrectionText(t); handleCorrectionSubmit(t); })
            }
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
              correctionRecording ? "bg-red-500 text-white" : "border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {correctionRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          {correctionText && !correctionRecording && (
            <button
              onClick={() => handleCorrectionSubmit(correctionText)}
              disabled={isProcessing}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => { setScreen("start"); setExtracted({}); setConfirmed({}); }}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
          title="Recommencer"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button onClick={handleConfirm} className={btnPrimary + " flex-1"}>
          <CheckCircle className="h-4 w-4" />
          Confirmer et appliquer
        </button>
      </div>
    </div>
  );

  // ─── Rendu principal ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={isMandatory ? undefined : onClose} />

      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[88vh]" style={{ minHeight: 480 }}>
        {/* Header modal */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">NXT Assistant</p>
              <p className="text-xs text-muted-foreground">
                {isProcessing ? "Analyse…" : isSpeaking ? "En train de parler…" : isRecording ? "En écoute…" : "Prêt"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setVoiceMuted(!voiceMuted); stopSpeaking(); setIsSpeaking(false); }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {voiceMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            {!isMandatory && (
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Contenu selon l'écran */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {screen === "start"          && renderStart()}
          {screen === "guided"         && renderGuided()}
          {screen === "import_preview" && renderConfirmation(true)}
          {screen === "confirmation"   && renderConfirmation(false)}
          {screen === "done"           && renderDone()}
        </div>
      </div>
    </div>
  );
}
