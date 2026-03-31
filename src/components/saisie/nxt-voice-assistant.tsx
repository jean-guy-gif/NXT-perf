"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic, MicOff, X, Volume2, VolumeX, CheckCircle, Loader2,
  Upload, Sparkles, RotateCcw, ChevronRight, Send
} from "lucide-react";
import { extractFromText, extractFromImage, speak, stopSpeaking, type ExtractedFields } from "@/lib/saisie-ai-client";

type AssistantScreen = "chat" | "import_preview" | "confirmation" | "done";

interface Message {
  role: "ai" | "user";
  text: string;
  extracted?: ExtractedFields;
}

interface NxtVoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onFieldsExtracted: (fields: ExtractedFields) => void;
  currentFields?: Partial<ExtractedFields>;
  isMandatory?: boolean;
}

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

const SECTIONS = [
  { title: "Prospection",          fields: ["contactsEntrants", "contactsTotaux", "rdvEstimation"] },
  { title: "Estimations & Mandats", fields: ["estimationsRealisees", "mandatsSignes", "rdvSuivi", "requalification", "baissePrix"] },
  { title: "Acheteurs & Visites",  fields: ["acheteursChaudsCount", "acheteursSortisVisite", "nombreVisites", "offresRecues", "compromisSignes"] },
  { title: "Ventes & CA",          fields: ["actesSignes", "chiffreAffaires"] },
] as const;

const GREETING = "Raconte-moi ton activité et donne-moi tes chiffres — contacts, estimations, mandats, visites, compromis, CA — pour que je puisse t'aider dans ta performance.";

export function NxtVoiceAssistant({
  isOpen,
  onClose,
  onFieldsExtracted,
  isMandatory = false,
}: NxtVoiceAssistantProps) {
  const [screen, setScreen]             = useState<AssistantScreen>("chat");
  const [messages, setMessages]         = useState<Message[]>([]);
  const [allExtracted, setAllExtracted] = useState<ExtractedFields>({});
  const [confirmed, setConfirmed]       = useState<ExtractedFields>({});
  const [importDesc, setImportDesc]     = useState("");
  const [isRecording, setIsRecording]   = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [voiceMuted, setVoiceMuted]     = useState(false);
  const [transcript, setTranscript]     = useState("");
  const [textInput, setTextInput]       = useState("");
  const [correctionText, setCorrectionText]       = useState("");
  const [correctionRecording, setCorrectionRecording] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages, transcript]);

  const sayMessage = useCallback((text: string, extracted?: ExtractedFields) => {
    setMessages(prev => [...prev, { role: "ai", text, extracted }]);
    if (!voiceMuted) {
      setIsSpeaking(true);
      speak(text, () => setIsSpeaking(false));
    }
  }, [voiceMuted]);

  // Reset + message d'accueil à l'ouverture
  useEffect(() => {
    if (!isOpen) return;
    setScreen("chat");
    setMessages([]);
    setAllExtracted({});
    setConfirmed({});
    setTextInput("");
    setTranscript("");
    setIsRecording(false);
    setIsProcessing(false);
    // Message d'accueil immédiat (sans appel API)
    setTimeout(() => {
      setMessages([{ role: "ai", text: GREETING }]);
      if (!voiceMuted) {
        setIsSpeaking(true);
        speak(GREETING, () => setIsSpeaking(false));
      }
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Traitement d'un message utilisateur ──────────────────────────────────
  const handleUserMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { role: "user", text }]);
    setIsProcessing(true);

    try {
      const result = await extractFromText(text, allExtracted);
      const newExtracted = { ...allExtracted, ...result.extracted };
      setAllExtracted(newExtracted);

      // Calculer les champs manquants importants
      const important = ["contactsTotaux", "estimationsRealisees", "mandatsSignes", "compromisSignes", "chiffreAffaires"] as (keyof ExtractedFields)[];
      const missing = important.filter(f => newExtracted[f] === undefined);

      let responseText = result.followUpQuestion || "";

      if (!responseText) {
        if (missing.length > 0) {
          const missingLabels = missing.slice(0, 3).map(f => FIELD_LABELS[f]).join(", ");
          responseText = `Merci ! Il me manque encore quelques éléments : ${missingLabels}. Tu peux me les donner ?`;
        } else {
          responseText = "J'ai tous les éléments. Veux-tu vérifier et valider tes chiffres ?";
        }
      }

      sayMessage(responseText, Object.keys(result.extracted).length > 0 ? result.extracted : undefined);

      // Si on a suffisamment de données, proposer la confirmation
      const filledCount = Object.keys(newExtracted).length;
      if (filledCount >= 5 && missing.length === 0) {
        setTimeout(() => {
          setConfirmed(newExtracted);
          setScreen("confirmation");
        }, 1500);
      }
    } catch {
      sayMessage("Je n'ai pas bien compris. Peux-tu reformuler ?");
    } finally {
      setIsProcessing(false);
    }
  }, [allExtracted, sayMessage]);

  // ── Enregistrement vocal ─────────────────────────────────────────────────
  const startRecording = useCallback((onResult: (t: string) => void) => {
    stopSpeaking();
    setIsSpeaking(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { sayMessage("Reconnaissance vocale non disponible. Utilisez Chrome ou Edge."); return; }
    const r = new SR();
    r.lang = "fr-FR";
    r.continuous = false;
    r.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      const res = e.results[e.results.length - 1];
      setTranscript(res[0].transcript);
      if (res.isFinal) { setTranscript(""); onResult(res[0].transcript); }
    };
    r.onend = () => { setIsRecording(false); setCorrectionRecording(false); };
    r.onerror = () => { setIsRecording(false); setCorrectionRecording(false); };
    recognitionRef.current = r;
    r.start();
    setIsRecording(true);
  }, [sayMessage]);

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setCorrectionRecording(false);
  };

  // ── Import image ─────────────────────────────────────────────────────────
  const handleImageImport = async (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp";
      try {
        const result = await extractFromImage(base64, mediaType);
        setAllExtracted(prev => ({ ...prev, ...result.extracted }));
        setConfirmed(result.extracted);
        setImportDesc(result.description || "Document analysé");
        setScreen("import_preview");
        sayMessage(`J'ai analysé votre document. ${result.description || ""} Vérifiez et corrigez si nécessaire.`);
      } catch {
        sayMessage("Je n'ai pas pu lire ce document. Essayez avec une image plus nette.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Correction IA sur l'écran de confirmation ────────────────────────────
  const handleCorrectionSubmit = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    try {
      const result = await extractFromText(text, confirmed);
      setConfirmed(prev => ({ ...prev, ...result.extracted }));
      if (Object.keys(result.extracted).length > 0) {
        const names = Object.keys(result.extracted).map(k => FIELD_LABELS[k as keyof ExtractedFields]).join(", ");
        sayMessage(`Mis à jour : ${names}.`);
      } else {
        sayMessage("Je n'ai pas compris. Modifiez directement les chiffres.");
      }
    } finally {
      setCorrectionText("");
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    onFieldsExtracted(confirmed);
    setScreen("done");
    sayMessage("Parfait ! Vos données ont été appliquées. Pensez à sauvegarder.");
    setTimeout(() => { if (!isMandatory) onClose(); }, 2500);
  };

  if (!isOpen) return null;

  const btnPrimary = "flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors";

  // ── Écran done ────────────────────────────────────────────────────────────
  const renderDone = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle className="h-7 w-7 text-green-500" />
      </div>
      <h2 className="text-lg font-bold text-foreground">Données appliquées</h2>
      <p className="text-sm text-muted-foreground">Pensez à sauvegarder votre saisie.</p>
    </div>
  );

  // ── Écran chat ────────────────────────────────────────────────────────────
  const renderChat = () => (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm"
            }`}>
              <p>{msg.text}</p>
              {msg.extracted && Object.keys(msg.extracted).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(msg.extracted).map(([k, v]) => (
                    <span key={k} className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-600">
                      ✓ {FIELD_LABELS[k as keyof ExtractedFields] || k} : {k === "chiffreAffaires" ? `${Number(v).toLocaleString("fr-FR")}€` : String(v)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {transcript && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary/20 px-4 py-2.5 text-sm text-primary italic">
              {transcript}…
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Résumé des extractions */}
      {Object.keys(allExtracted).length > 0 && (
        <div className="mx-4 mb-2 rounded-xl border border-green-500/20 bg-green-500/5 px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-green-600">{Object.keys(allExtracted).length} champ{Object.keys(allExtracted).length > 1 ? "s" : ""} collecté{Object.keys(allExtracted).length > 1 ? "s" : ""}</p>
            <button
              onClick={() => { setConfirmed(allExtracted); setScreen("confirmation"); }}
              className="text-xs text-primary hover:underline font-medium"
            >
              Vérifier et valider →
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(allExtracted).map(([k, v]) => (
              <span key={k} className="text-xs rounded-full bg-green-500/10 text-green-700 px-2 py-0.5">
                {FIELD_LABELS[k as keyof ExtractedFields] || k} : {k === "chiffreAffaires" ? `${Number(v).toLocaleString("fr-FR")}€` : String(v)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Zone de saisie */}
      <div className="px-4 pb-4 space-y-3">
        {/* Input texte */}
        <div className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && textInput.trim()) { handleUserMessage(textInput); setTextInput(""); } }}
            placeholder="Ou tapez votre réponse…"
            className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          {textInput.trim() && (
            <button
              onClick={() => { handleUserMessage(textInput); setTextInput(""); }}
              disabled={isProcessing}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Contrôles */}
        <div className="flex items-center justify-between gap-3">
          {/* Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            <span className="text-[10px] font-medium">Importer</span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImageImport(e.target.files[0])} />

          {/* Micro */}
          <button
            onClick={() => isRecording ? stopRecording() : startRecording((t) => handleUserMessage(t))}
            disabled={isProcessing}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-all shadow-lg ${
              isRecording ? "bg-red-500 text-white scale-110 animate-pulse shadow-red-500/30"
                          : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
            } disabled:opacity-50`}
          >
            {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" />
              : isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Valider */}
          {Object.keys(allExtracted).length > 0 ? (
            <button
              onClick={() => { setConfirmed(allExtracted); setScreen("confirmation"); }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
              title="Vérifier et valider"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          ) : <div className="h-10 w-10" />}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {isRecording ? "Parlez… cliquez pour arrêter" : "🎙️ Parlez · ⌨️ Tapez · 📎 Importez"}
        </p>
      </div>
    </div>
  );

  // ── Écran confirmation ────────────────────────────────────────────────────
  const renderConfirmation = (isImport = false) => (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <p className="text-sm font-semibold text-foreground">
          {isImport ? `📎 ${importDesc}` : "Vérification de vos données"}
        </p>
        <p className="text-xs text-muted-foreground">Modifiez si nécessaire avant de valider</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{section.title}</p>
            <div className="space-y-1">
              {section.fields.map((f) => (
                <div key={f} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                  <span className="text-xs text-foreground flex-1 mr-2">{FIELD_LABELS[f as keyof ExtractedFields]}</span>
                  <input
                    type="number"
                    min={0}
                    value={confirmed[f as keyof ExtractedFields] ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? undefined : Number(e.target.value);
                      setConfirmed(prev => {
                        const next = { ...prev };
                        if (val === undefined) delete next[f as keyof ExtractedFields];
                        else (next as Record<string, number>)[f] = val;
                        return next;
                      });
                    }}
                    placeholder="—"
                    className="w-20 rounded-md border border-input bg-muted px-2 py-1 text-right text-sm font-semibold outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Correction IA */}
      <div className="px-4 py-2 border-t border-border shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={correctionText}
            onChange={(e) => setCorrectionText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCorrectionSubmit(correctionText); }}
            placeholder="Corriger avec l'IA : ex. « les compromis c'est 3 »"
            className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => correctionRecording ? stopRecording() : startRecording((t) => { setCorrectionText(t); handleCorrectionSubmit(t); })}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${correctionRecording ? "bg-red-500 text-white" : "border border-border bg-background text-muted-foreground hover:bg-muted"}`}
          >
            {correctionRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="px-4 pb-4 flex gap-2 shrink-0">
        <button
          onClick={() => { setScreen("chat"); }}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
          title="Retour à la conversation"
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={isMandatory ? undefined : onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[88vh]" style={{ minHeight: 460 }}>
        {/* Header */}
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
            <button onClick={() => { setVoiceMuted(!voiceMuted); stopSpeaking(); setIsSpeaking(false); }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              {voiceMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            {!isMandatory && (
              <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {screen === "chat"          && renderChat()}
          {screen === "import_preview" && renderConfirmation(true)}
          {screen === "confirmation"  && renderConfirmation(false)}
          {screen === "done"          && renderDone()}
        </div>
      </div>
    </div>
  );
}
