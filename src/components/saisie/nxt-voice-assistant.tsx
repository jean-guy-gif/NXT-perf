"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, X, Volume2, VolumeX, CheckCircle, Loader2, Upload, Sparkles } from "lucide-react";
import { extractFromText, extractFromImage, getGreeting, speak, stopSpeaking, type ExtractedFields } from "@/lib/saisie-ai-client";

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

export function NxtVoiceAssistant({
  isOpen,
  onClose,
  onFieldsExtracted,
  currentFields = {},
  isMandatory = false,
}: NxtVoiceAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [allExtracted, setAllExtracted] = useState<ExtractedFields>({});
  const [isDragging, setIsDragging] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // suppress unused warning for isDragging setter used in drag handlers
  void isDragging;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const addAIMessage = useCallback((text: string, extracted?: ExtractedFields) => {
    setMessages(prev => [...prev, { role: "ai", text, extracted }]);
    if (!voiceMuted) {
      setIsSpeaking(true);
      speak(text, () => setIsSpeaking(false));
    }
  }, [voiceMuted]);

  // Initialisation : message d'accueil
  useEffect(() => {
    if (!isOpen) return;
    setMessages([]);
    setAllExtracted({});

    getGreeting(isMandatory).then(greeting => {
      addAIMessage(greeting);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleUserSpeech = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setMessages(prev => [...prev, { role: "user", text }]);
    setIsProcessing(true);

    try {
      const result = await extractFromText(text, { ...currentFields, ...allExtracted });

      const newExtracted = { ...allExtracted, ...result.extracted };
      setAllExtracted(newExtracted);

      const fieldsCount = Object.keys(result.extracted).length;
      let responseText = result.followUpQuestion;

      if (fieldsCount > 0 && result.confidence > 0.7 && !result.missingImportant?.length) {
        responseText = "Parfait, j'ai tout ce qu'il me faut. Cliquez sur Appliquer pour remplir votre tableau de bord.";
      }

      addAIMessage(responseText, result.extracted);
    } catch {
      addAIMessage("Je n'ai pas bien compris. Pouvez-vous reformuler ?");
    } finally {
      setIsProcessing(false);
    }
  }, [allExtracted, currentFields, addAIMessage]);

  // Initialisation Web Speech API
  const startRecording = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      addAIMessage("La reconnaissance vocale n'est pas disponible sur votre navigateur. Utilisez Chrome ou Edge.");
      return;
    }

    stopSpeaking();
    setIsSpeaking(false);

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);
      if (result.isFinal) {
        setTranscript("");
        handleUserSpeech(text);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [addAIMessage, handleUserSpeech]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const handleImageImport = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp";

      setMessages(prev => [...prev, { role: "user", text: `📎 Image importée : ${file.name}` }]);
      setIsProcessing(true);

      try {
        const result = await extractFromImage(base64, mediaType);
        const newExtracted = { ...allExtracted, ...result.extracted };
        setAllExtracted(newExtracted);

        const count = Object.keys(result.extracted).length;
        const msg = count > 0
          ? `J'ai extrait ${count} indicateur${count > 1 ? "s" : ""} de votre image. Cliquez sur Appliquer pour remplir les champs.`
          : "Je n'ai pas pu extraire de données de cette image. Essayez avec une image plus nette.";

        addAIMessage(msg, result.extracted);
      } catch {
        addAIMessage("Erreur lors de l'analyse de l'image.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    onFieldsExtracted(allExtracted);
    addAIMessage("Tous vos chiffres ont été appliqués. Pensez à valider votre saisie !");
    setTimeout(() => {
      if (!isMandatory) onClose();
    }, 2000);
  };

  const hasExtracted = Object.keys(allExtracted).length > 0;
  const fieldLabels: Record<string, string> = {
    contactsEntrants: "Contacts entrants",
    contactsTotaux: "Contacts totaux",
    rdvEstimation: "RDV estimations",
    estimationsRealisees: "Estimations",
    mandatsSignes: "Mandats signés",
    acheteursChaudsCount: "Acheteurs chauds",
    nombreVisites: "Visites",
    offresRecues: "Offres",
    compromisSignes: "Compromis",
    actesSignes: "Actes signés",
    chiffreAffaires: "CA (€)",
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isMandatory ? undefined : onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[85vh]"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file?.type.startsWith("image/")) handleImageImport(file);
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">NXT Assistant</p>
              <p className="text-xs text-muted-foreground">
                {isRecording ? "En écoute..." : isProcessing ? "Analyse en cours..." : isSpeaking ? "Parle..." : "Prêt"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setVoiceMuted(!voiceMuted); stopSpeaking(); }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {voiceMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            {!isMandatory && (
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                <p>{msg.text}</p>
                {msg.extracted && Object.keys(msg.extracted).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.entries(msg.extracted).map(([k, v]) => (
                      <span key={k} className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600">
                        ✓ {fieldLabels[k] || k} : {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Transcript en temps réel */}
          {transcript && (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary/20 px-4 py-2.5 text-sm text-primary italic">
                {transcript}...
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5">
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

        {/* Zone d'extraction résumée */}
        {hasExtracted && (
          <div className="mx-4 mb-2 rounded-xl border border-green-500/20 bg-green-500/5 p-3">
            <p className="text-xs font-medium text-green-600 mb-1.5">Champs extraits ({Object.keys(allExtracted).length})</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(allExtracted).map(([k, v]) => (
                <span key={k} className="text-xs rounded-full bg-green-500/10 text-green-700 px-2 py-0.5">
                  {fieldLabels[k] || k} : {k === "chiffreAffaires" ? `${(v as number)?.toLocaleString("fr-FR")} €` : String(v)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contrôles */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center justify-center gap-3">
            {/* Import image */}
            <button
  onClick={() => fileInputRef.current?.click()}
  disabled={isProcessing}
  className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
  title="Importer un tableau, une capture CRM ou une photo"
>
  <Upload className="h-5 w-5" />
  <span className="text-[10px] font-medium">Importer</span>
</button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageImport(e.target.files[0])}
            />

            {/* Bouton micro */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`flex h-16 w-16 items-center justify-center rounded-full transition-all shadow-lg ${
                isRecording
                  ? "bg-red-500 text-white scale-110 shadow-red-500/30 animate-pulse"
                  : isProcessing
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
              }`}
            >
              {isProcessing ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : isRecording ? (
                <MicOff className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </button>

            {/* Appliquer */}
            {hasExtracted ? (
              <button
                onClick={handleApply}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                title="Appliquer les champs extraits"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
            ) : (
              <div className="h-10 w-10" />
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {isRecording ? "Parlez… Cliquez pour arrêter" : "🎙️ Parlez · 📎 Importez · ✓ Appliquez"}
          </p>
        </div>
      </div>
    </div>
  );
}
