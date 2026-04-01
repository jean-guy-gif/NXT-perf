"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, MessageCircle, Mic, Volume2, VolumeX, Keyboard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";
import { extractFromConversation } from "@/lib/saisie-ai-client";
import type { ExtractedFields, ExtractedArrays } from "@/lib/saisie-ai-client";

// ── Web Speech API types (not in all TS configs) ─────────────────────────────

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  0: { readonly transcript: string; readonly confidence: number };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

// ── Block definitions ────────────────────────────────────────────────────────

type BlockId = "prospection" | "vendeurs" | "acheteurs" | "ventes";

interface Block {
  id: BlockId;
  label: string;
  amorce: (firstName: string) => string;
  targetFields: string[];
  relances: { field: string; question: string; condition?: (fields: ExtractedFields) => boolean }[];
}

const BLOCKS: Block[] = [
  {
    id: "prospection",
    label: "Prospection",
    amorce: (name) =>
      `${name}, on démarre. Cette semaine en prospection : tu as eu combien de contacts au total, et combien venaient de tes portails ou vitrine ?`,
    targetFields: ["contactsTotaux", "contactsEntrants", "rdvEstimation", "informationsVente"],
    relances: [
      { field: "contactsEntrants", question: "Et parmi eux, combien étaient entrants (portails, vitrine) ?" },
      { field: "rdvEstimation", question: "Tu as décroché des RDV estimation ?" },
      { field: "informationsVente", question: "Des infos de vente à noter — projets vendeurs pas encore en RDV ?" },
    ],
  },
  {
    id: "vendeurs",
    label: "Vendeurs",
    amorce: () =>
      "Côté vendeurs. Combien d'estimations réalisées, et tu as signé des mandats ? Donne-moi le nombre et le type (exclusif/simple).",
    targetFields: ["estimationsRealisees", "mandatsSignes", "rdvSuivi", "requalificationSimpleExclusif", "baissePrix"],
    relances: [
      { field: "rdvSuivi", question: "Des RDV de suivi avec des vendeurs en cours ?" },
      { field: "requalificationSimpleExclusif", question: "Une requalification simple → exclusif ?" },
      { field: "baissePrix", question: "Une baisse de prix acceptée ?" },
    ],
  },
  {
    id: "acheteurs",
    label: "Acheteurs",
    amorce: () =>
      "Les acheteurs. De nouveaux acheteurs chauds cette semaine ? Et combien de visites ?",
    targetFields: ["acheteursChaudsCount", "acheteursSortisVisite", "nombreVisites", "offresRecues", "compromisSignes"],
    relances: [
      { field: "acheteursSortisVisite", question: "Combien d'acheteurs distincts en visite, et combien de visites au total ?" },
      { field: "offresRecues", question: "Des offres reçues ?" },
      { field: "compromisSignes", question: "Des compromis signés ?" },
    ],
  },
  {
    id: "ventes",
    label: "Ventes",
    amorce: () => "Pour finir, les ventes. Des actes signés cette semaine ?",
    targetFields: ["actesSignes", "chiffreAffaires"],
    relances: [
      {
        field: "chiffreAffaires",
        question: "Quel CA sur ces actes ?",
        condition: (f) => (f.actesSignes ?? 0) > 0,
      },
    ],
  },
];

const BLOCK_ORDER: BlockId[] = ["prospection", "vendeurs", "acheteurs", "ventes"];

// ── Chat message type ────────────────────────────────────────────────────────

interface ChatMessage {
  role: "assistant" | "user";
  text: string;
}

// ── Draft helpers ────────────────────────────────────────────────────────────

function getSundayExpiry(): string {
  const d = new Date();
  const day = d.getDay() || 7;
  const sunday = new Date(d);
  sunday.setDate(d.getDate() + (7 - day));
  sunday.setHours(23, 59, 59, 0);
  return sunday.toISOString();
}

function getMonthStart(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

// ── TTS helpers ──────────────────────────────────────────────────────────────

function speak(text: string, onEnd?: () => void): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();

  const doSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.rate = 0.92;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const frVoices = voices.filter(v => v.lang === "fr-FR" || v.lang.startsWith("fr-"));
    const PREFERRED = [
      "Google français", "Google French", "Amélie", "Thomas",
      "Microsoft Paul Online", "Microsoft Hortense Online",
      "fr-FR-DeniseNeural", "fr-FR-HenriNeural",
    ];
    let selected: SpeechSynthesisVoice | undefined;
    for (const name of PREFERRED) {
      selected = frVoices.find(v => v.name.includes(name));
      if (selected) break;
    }
    if (!selected) selected = frVoices[0];
    if (!selected && voices.length > 0) selected = voices[0];
    if (selected) utterance.voice = selected;

    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    doSpeak();
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      doSpeak();
    };
    setTimeout(doSpeak, 500);
  }
}

function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// ── STT helpers ──────────────────────────────────────────────────────────────

function getSpeechRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface VoiceConversationProps {
  onDismiss: () => void;
  onComplete: (fields: ExtractedFields, arrays: ExtractedArrays) => void;
}

type MicState = "idle" | "listening" | "processing";

// ── Component ────────────────────────────────────────────────────────────────

export function VoiceConversation({ onDismiss, onComplete }: VoiceConversationProps) {
  const user = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);
  const firstName = user?.firstName || "Conseiller";

  // Voice mode
  const sttAvailable = typeof window !== "undefined" && !!getSpeechRecognition();
  const [voiceMode, setVoiceMode] = useState(sttAvailable);
  const [muted, setMuted] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("nxt-voice-muted") === "true";
    return false;
  });
  const [micState, setMicState] = useState<MicState>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSpeakRef = useRef<string | null>(null);

  // Conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [blockIdx, setBlockIdx] = useState(0);
  const [relanceIdx, setRelanceIdx] = useState(0);
  const [inRelance, setInRelance] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Accumulated data
  const [fields, setFields] = useState<ExtractedFields>({});
  const [arrays, setArrays] = useState<ExtractedArrays>({
    mandats: [], informationsVente: [], acheteursChauds: [],
  });
  const [uncertain, setUncertain] = useState<string[]>([]);

  // Draft
  const [draftChecked, setDraftChecked] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [draftData, setDraftData] = useState<{
    fields: ExtractedFields;
    arrays: ExtractedArrays;
    lastBlock: BlockId;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Suppress unused var warnings
  void relanceIdx;
  void uncertain;

  // ── Mute persistence ────────────────────────────────────────────────────
  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem("nxt-voice-muted", String(next));
      if (next) stopSpeaking();
      return next;
    });
  };

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveTranscript]);

  useEffect(() => {
    if (!isExtracting && !voiceMode) inputRef.current?.focus();
  }, [isExtracting, messages, voiceMode]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopSpeaking();
      recognitionRef.current?.abort();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  // ── TTS: speak assistant messages ────────────────────────────────────────
  const speakText = useCallback((text: string) => {
    if (muted || !voiceMode) return;
    setIsSpeaking(true);
    speak(text, () => {
      setIsSpeaking(false);
      // Auto-start mic after IA finishes speaking
      if (voiceMode) {
        pendingSpeakRef.current = null;
        startListening();
      }
    });
  }, [muted, voiceMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── STT: start listening ─────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR || micState === "listening") return;

    // Barge-in: stop TTS if playing
    stopSpeaking();
    setIsSpeaking(false);

    setMicState("listening");
    setLiveTranscript("");

    const recognition = new SR();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = true;

    let finalTranscript = "";

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      // Reset silence timer on any result
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + t.trim();
        } else {
          interim = t;
        }
      }
      setLiveTranscript(finalTranscript + (interim ? " " + interim : ""));

      // Start silence timer — 10s of no new results = stop
      silenceTimerRef.current = setTimeout(() => {
        recognition.stop();
      }, 10000);
    };

    recognition.onend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      const text = finalTranscript.trim();
      if (text) {
        setMicState("processing");
        setLiveTranscript("");
        submitText(text);
      } else {
        setMicState("idle");
        setLiveTranscript("");
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (e.error === "not-allowed" || e.error === "permission-denied") {
        // Micro refused → force text mode
        setVoiceMode(false);
        setMicState("idle");
        setLiveTranscript("");
        const sysMsg: ChatMessage = {
          role: "assistant",
          text: "Micro non disponible, passage en mode texte.",
        };
        setMessages((prev) => [...prev, sysMsg]);
        return;
      }
      // Other errors: just stop
      setMicState("idle");
      setLiveTranscript("");
    };

    recognitionRef.current = recognition;

    // Start silence timer from the beginning
    silenceTimerRef.current = setTimeout(() => {
      recognition.stop();
    }, 10000);

    try {
      recognition.start();
    } catch {
      setMicState("idle");
    }
  }, [micState]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
  };

  // ── Check for existing draft ─────────────────────────────────────────────
  useEffect(() => {
    if (draftChecked || isDemo || !user?.id) {
      if (!draftChecked) {
        setDraftChecked(true);
        startBlock(0);
      }
      return;
    }

    const checkDraft = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("voice_drafts")
        .select("*")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .order("updated_at", { ascending: false })
        .limit(1);

      setDraftChecked(true);

      if (data && data.length > 0) {
        const draft = data[0];
        const partialData = draft.partial_data as { fields?: ExtractedFields; arrays?: ExtractedArrays } | null;
        if (partialData && draft.last_block) {
          setDraftData({
            fields: partialData.fields || {},
            arrays: partialData.arrays || { mandats: [], informationsVente: [], acheteursChauds: [] },
            lastBlock: draft.last_block as BlockId,
          });
          setShowDraftPrompt(true);
          return;
        }
      }

      startBlock(0);
    };

    checkDraft();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Start a block ────────────────────────────────────────────────────────

  const startBlock = useCallback((idx: number) => {
    if (idx >= BLOCKS.length) {
      const closingMsg: ChatMessage = {
        role: "assistant",
        text: "C'est tout ! Je récapitule. Vérifie et enregistre.",
      };
      setMessages((prev) => [...prev, closingMsg]);
      setIsDone(true);
      speakText("C'est tout ! Je récapitule. Vérifie et enregistre.");
      return;
    }

    const block = BLOCKS[idx];
    const text = block.amorce(firstName);
    const amorceMsg: ChatMessage = { role: "assistant", text };
    setBlockIdx(idx);
    setRelanceIdx(0);
    setInRelance(false);
    setMessages((prev) => [...prev, amorceMsg]);
    speakText(text);
  }, [firstName, speakText]);

  // ── Resume draft ─────────────────────────────────────────────────────────

  const resumeDraft = () => {
    if (!draftData) return;
    setFields(draftData.fields);
    setArrays(draftData.arrays);
    setShowDraftPrompt(false);

    const lastIdx = BLOCK_ORDER.indexOf(draftData.lastBlock);
    const nextIdx = lastIdx + 1;

    const resumeText = `On reprend où tu t'étais arrêté — j'ai déjà tes données de ${BLOCK_ORDER.slice(0, lastIdx + 1).join(", ")}.`;
    const resumeMsg: ChatMessage = { role: "assistant", text: resumeText };
    setMessages([resumeMsg]);
    speakText(resumeText);
    // Start next block after a short delay to let the resume message be spoken
    setTimeout(() => startBlock(nextIdx), 500);
  };

  const restartFresh = () => {
    setShowDraftPrompt(false);
    setDraftData(null);
    startBlock(0);
  };

  // ── Save draft to Supabase ───────────────────────────────────────────────

  const saveDraft = useCallback(async (currentFields: ExtractedFields, currentArrays: ExtractedArrays, lastBlock: BlockId) => {
    if (isDemo || !user?.id) return;
    const supabase = createClient();
    const periodStart = getMonthStart();

    await supabase.from("voice_drafts").delete().eq("user_id", user.id);
    await supabase.from("voice_drafts").insert({
      user_id: user.id,
      period_start: periodStart,
      partial_data: { fields: currentFields, arrays: currentArrays },
      last_block: lastBlock,
      expires_at: getSundayExpiry(),
    });
  }, [isDemo, user?.id]);

  // ── Merge extraction result ──────────────────────────────────────────────

  const mergeResult = useCallback((result: { extracted: ExtractedFields; arrays: ExtractedArrays; uncertain: string[] }) => {
    setFields((prev) => {
      const merged = { ...prev };
      for (const [key, value] of Object.entries(result.extracted)) {
        if (value !== undefined && value !== null) {
          (merged as Record<string, number>)[key] = value as number;
        }
      }
      return merged;
    });

    setArrays((prev) => ({
      mandats: [...prev.mandats, ...result.arrays.mandats],
      informationsVente: [...prev.informationsVente, ...result.arrays.informationsVente],
      acheteursChauds: [...prev.acheteursChauds, ...result.arrays.acheteursChauds],
    }));

    if (result.uncertain.length > 0) {
      setUncertain((prev) => [...new Set([...prev, ...result.uncertain])]);
    }
  }, []);

  // ── Submit text (shared by text input and STT) ───────────────────────────

  const submitText = useCallback(async (text: string) => {
    if (!text || isExtracting || isDone) {
      setMicState("idle");
      return;
    }

    const userMsg: ChatMessage = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsExtracting(true);

    const block = BLOCKS[blockIdx];
    const result = await extractFromConversation(text, fields, block.targetFields);
    mergeResult(result);

    const updatedFields: ExtractedFields = { ...fields };
    for (const [key, value] of Object.entries(result.extracted)) {
      if (value !== undefined && value !== null) {
        (updatedFields as Record<string, number>)[key] = value as number;
      }
    }

    if (!inRelance) {
      const missingRelance = block.relances.find((r) => {
        const val = (updatedFields as Record<string, number | undefined>)[r.field];
        const isMissing = val === undefined;
        const conditionMet = !r.condition || r.condition(updatedFields);
        return isMissing && conditionMet;
      });

      if (missingRelance) {
        setInRelance(true);
        setRelanceIdx(block.relances.indexOf(missingRelance));
        const relanceMsg: ChatMessage = { role: "assistant", text: missingRelance.question };
        setMessages((prev) => [...prev, relanceMsg]);
        setIsExtracting(false);
        setMicState("idle");
        speakText(missingRelance.question);
        return;
      }
    }

    await saveDraft(updatedFields, {
      ...arrays,
      mandats: [...arrays.mandats, ...result.arrays.mandats],
      informationsVente: [...arrays.informationsVente, ...result.arrays.informationsVente],
      acheteursChauds: [...arrays.acheteursChauds, ...result.arrays.acheteursChauds],
    }, block.id);

    setIsExtracting(false);
    setMicState("idle");
    startBlock(blockIdx + 1);
  }, [isExtracting, isDone, blockIdx, fields, inRelance, arrays, mergeResult, saveDraft, startBlock, speakText]);

  // ── Text mode handlers ───────────────────────────────────────────────────

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    submitText(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFinish = () => {
    stopSpeaking();
    onComplete(fields, arrays);
  };

  // ── Draft prompt ─────────────────────────────────────────────────────────
  if (showDraftPrompt) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative z-10 flex max-w-md flex-col items-center gap-6 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <MessageCircle className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Tu avais commencé une saisie</h2>
          <p className="text-sm text-muted-foreground">On reprend là où tu t&apos;étais arrêté ?</p>
          <div className="flex gap-3 w-full">
            <button onClick={restartFresh} className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors">
              Recommencer
            </button>
            <button onClick={resumeDraft} className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              Reprendre
            </button>
          </div>
          <button onClick={onDismiss} className="text-xs text-muted-foreground transition-colors hover:text-muted-foreground/70" style={{ fontSize: 12 }}>
            Passer pour l&apos;instant
          </button>
        </div>
      </div>
    );
  }

  // ── Main chat UI ─────────────────────────────────────────────────────────
  const currentBlock = blockIdx < BLOCKS.length ? BLOCKS[blockIdx] : null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">NXT Assistant</p>
            <p className="text-xs text-muted-foreground">
              {isDone
                ? "Terminé"
                : isSpeaking
                  ? "En train de parler…"
                  : micState === "listening"
                    ? "En écoute…"
                    : currentBlock
                      ? `${currentBlock.label} — ${blockIdx + 1} / ${BLOCKS.length}`
                      : "Prêt"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode toggle — only show if STT available */}
          {sttAvailable && (
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setVoiceMode(true)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors ${voiceMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Mic className="h-3 w-3" />
                Voix
              </button>
              <button
                onClick={() => { setVoiceMode(false); stopListening(); stopSpeaking(); }}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors ${!voiceMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Keyboard className="h-3 w-3" />
                Texte
              </button>
            </div>
          )}

          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* Block progress */}
          <div className="flex gap-1 ml-1">
            {BLOCKS.map((b, i) => (
              <div
                key={b.id}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i < blockIdx ? "bg-primary" : i === blockIdx ? "bg-primary/50" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted text-foreground rounded-bl-md"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {/* Live transcript while listening */}
        {micState === "listening" && liveTranscript && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed bg-primary/30 text-primary-foreground/70 rounded-br-md italic">
              {liveTranscript}
            </div>
          </div>
        )}

        {(isExtracting || micState === "processing") && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 rounded-bl-md">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Analyse…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 border-t border-border shrink-0">
        {isDone ? (
          <div className="flex flex-col items-center gap-3">
            <button onClick={handleFinish} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              Terminer et voir le résumé
            </button>
            <button onClick={onDismiss} className="text-xs text-muted-foreground transition-colors hover:text-muted-foreground/70" style={{ fontSize: 12 }}>
              Passer pour l&apos;instant
            </button>
          </div>
        ) : voiceMode ? (
          /* Voice mode input */
          <div className="flex flex-col items-center gap-2">
            {micState === "listening" ? (
              <>
                <button
                  onClick={stopListening}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-xl shadow-red-500/30 animate-pulse transition-all hover:bg-red-600"
                >
                  <Mic className="h-7 w-7" />
                </button>
                <p className="text-xs text-muted-foreground">En écoute… appuie pour terminer</p>
              </>
            ) : micState === "processing" ? (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Analyse en cours…</p>
              </>
            ) : (
              <>
                <button
                  onClick={startListening}
                  disabled={isExtracting || isSpeaking}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Mic className="h-7 w-7" />
                </button>
                <p className="text-xs text-muted-foreground">
                  {isSpeaking ? "L'assistant parle…" : "Appuie pour parler"}
                </p>
              </>
            )}
          </div>
        ) : (
          /* Text mode input */
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExtracting}
              placeholder="Tape ta réponse…"
              autoFocus
              className="flex-1 rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={isExtracting || !inputText.trim()}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
