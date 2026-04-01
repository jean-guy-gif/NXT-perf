"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, MessageCircle, Mic, Volume2, VolumeX, Keyboard } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { parseCountField, parseNumericResponse, parseMandatsText, parseDetailsText, normalize, capitalizeFirst } from "@/lib/saisie-parser";
import { SAISIE_STEPS, getNextApplicableStep } from "@/lib/saisie-steps";
import type { ExtractedFields, ExtractedArrays } from "@/lib/saisie-ai-client";

// ── Web Speech API types ─────────────────────────────────────────────────────

interface SpeechRecognitionResult { readonly isFinal: boolean; readonly length: number; 0: { readonly transcript: string; readonly confidence: number }; }
interface SpeechRecognitionResultList { readonly length: number; [index: number]: SpeechRecognitionResult; }
interface SpeechRecognitionEvent extends Event { readonly resultIndex: number; readonly results: SpeechRecognitionResultList; }
interface SpeechRecognitionErrorEvent extends Event { readonly error: string; }
interface SpeechRecognition extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  start(): void; stop(): void; abort(): void;
}

// ── Chat message ─────────────────────────────────────────────────────────────

interface ChatMessage { role: "assistant" | "user"; text: string; }

// ── TTS ──────────────────────────────────────────────────────────────────────

function speakTTS(text: string, onEnd?: () => void): void {
  if (typeof window === "undefined" || !window.speechSynthesis) { console.log("[VOICE] TTS_SKIP: no speechSynthesis"); onEnd?.(); return; }
  window.speechSynthesis.cancel();
  console.log("[VOICE] TTS_START:", text.slice(0, 60));
  const doSpeak = () => {
    const u = new SpeechSynthesisUtterance(text); u.lang = "fr-FR"; u.rate = 0.92; u.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const fr = voices.filter(v => v.lang === "fr-FR" || v.lang.startsWith("fr-"));
    const PREF = ["Google français","Google French","Amélie","Thomas","Microsoft Paul Online","Microsoft Hortense Online"];
    let sel: SpeechSynthesisVoice | undefined;
    for (const n of PREF) { sel = fr.find(v => v.name.includes(n)); if (sel) break; }
    if (!sel) sel = fr[0]; if (!sel && voices.length) sel = voices[0];
    if (sel) u.voice = sel;
    u.onend = () => { console.log("[VOICE] TTS_END:", text.slice(0, 40)); onEnd?.(); };
    u.onerror = (ev) => { console.log("[VOICE] TTS_ERROR:", ev); onEnd?.(); };
    window.speechSynthesis.speak(u);
  };
  if (window.speechSynthesis.getVoices().length > 0) doSpeak();
  else { window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; doSpeak(); }; setTimeout(doSpeak, 500); }
}
function stopSpeaking(): void { if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel(); }

// ── STT ──────────────────────────────────────────────────────────────────────

function getSR(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any; return w.SpeechRecognition || w.webkitSpeechRecognition || null;
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
  const firstName = user?.firstName || "Conseiller";

  // Voice mode
  const sttAvailable = typeof window !== "undefined" && !!getSR();
  const [voiceMode, setVoiceMode] = useState(sttAvailable);
  const [muted, setMuted] = useState(() => typeof window !== "undefined" ? localStorage.getItem("nxt-voice-muted") === "true" : false);
  const [micState, setMicState] = useState<MicState>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Conversation
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stepIdx, setStepIdx] = useState(-1);
  const [inputText, setInputText] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [awaitingRelance, setAwaitingRelance] = useState(false);
  const [awaitingDetailConfirm, setAwaitingDetailConfirm] = useState(false);

  // Refs for closure safety — THE critical fix
  const fieldsRef = useRef<ExtractedFields>({});
  const arraysRef = useRef<ExtractedArrays>({ mandats: [], informationsVente: [], acheteursChauds: [] });
  const stepIdxRef = useRef(-1);
  const isDoneRef = useRef(false);
  const awaitingRelanceRef = useRef(false);
  const voiceModeRef = useRef(sttAvailable);
  const mutedRef = useRef(false);
  const initRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep refs in sync
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const toggleMute = () => { setMuted(p => { const n = !p; localStorage.setItem("nxt-voice-muted", String(n)); if (n) stopSpeaking(); return n; }); };
  const addMsg = (role: "assistant" | "user", text: string) => setMessages(p => [...p, { role, text }]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, liveTranscript]);
  useEffect(() => { if (!voiceMode) inputRef.current?.focus(); }, [messages, voiceMode]);
  useEffect(() => () => { stopSpeaking(); recognitionRef.current?.abort(); if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current); }, []);

  // getNextApplicableStep imported from saisie-steps.ts

  // ── Ask a step (reads from refs, not stale state) ──────────────────────
  const askStep = (idx: number) => {
    console.log("[VOICE] ASK_STEP:", idx, idx < SAISIE_STEPS.length ? SAISIE_STEPS[idx].id : "DONE");
    if (idx >= SAISIE_STEPS.length) {
      const t = "C'est tout ! Vérifie tes données et enregistre.";
      addMsg("assistant", t);
      setIsDone(true); isDoneRef.current = true;
      doSpeak(t);
      return;
    }
    const step = SAISIE_STEPS[idx];
    setStepIdx(idx); stepIdxRef.current = idx;
    setAwaitingRelance(false); awaitingRelanceRef.current = false;
    addMsg("assistant", step.prompt);
    doSpeak(step.prompt);
  };

  // ── TTS wrapper that uses refs (no stale closure) ──────────────────────
  const doSpeak = (text: string) => {
    if (mutedRef.current || !voiceModeRef.current) {
      console.log("[VOICE] TTS_MUTED_OR_TEXT_MODE, skipping speak");
      return;
    }
    setIsSpeaking(true);
    speakTTS(text, () => {
      console.log("[VOICE] TTS_CALLBACK → starting mic");
      setIsSpeaking(false);
      if (voiceModeRef.current) doStartListening();
    });
  };

  // ── STT (reads processInput from ref) ──────────────────────────────────
  const doStartListening = () => {
    const SR = getSR();
    if (!SR) { console.log("[VOICE] MIC_NO_SR"); return; }
    stopSpeaking(); setIsSpeaking(false);
    setMicState("listening"); setLiveTranscript("");
    console.log("[VOICE] MIC_START");

    const rec = new SR(); rec.lang = "fr-FR"; rec.continuous = false; rec.interimResults = true;
    let finalText = "";
    const startTime = Date.now();

    rec.onresult = (e: SpeechRecognitionEvent) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += (finalText ? " " : "") + t.trim();
        else interim = t;
      }
      setLiveTranscript(finalText + (interim ? " " + interim : ""));
      silenceTimerRef.current = setTimeout(() => { console.log("[VOICE] MIC_SILENCE_TIMEOUT"); rec.stop(); }, 6000);
    };

    rec.onend = () => {
      const duration = Date.now() - startTime;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      const t = finalText.trim();
      console.log("[VOICE] MIC_END duration:", duration, "ms, text:", JSON.stringify(t));
      if (t) {
        setMicState("processing"); setLiveTranscript("");
        doProcessInput(t);
      } else {
        console.log("[VOICE] MIC_EMPTY → idle");
        setMicState("idle"); setLiveTranscript("");
      }
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.log("[VOICE] MIC_ERROR:", e.error);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (e.error === "not-allowed" || e.error === "permission-denied") {
        setVoiceMode(false); voiceModeRef.current = false;
        setMicState("idle"); setLiveTranscript("");
        addMsg("assistant", "Micro non disponible, passage en mode texte.");
        return;
      }
      setMicState("idle"); setLiveTranscript("");
    };

    recognitionRef.current = rec;
    silenceTimerRef.current = setTimeout(() => { console.log("[VOICE] MIC_INITIAL_TIMEOUT"); rec.stop(); }, 8000);
    try { rec.start(); } catch (err) { console.log("[VOICE] MIC_START_ERROR:", err); setMicState("idle"); }
  };

  const stopListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
  };

  // ── Process input (reads ALL from refs — no stale closures) ────────────
  const doProcessInput = (text: string) => {
    const currentIdx = stepIdxRef.current;
    const done = isDoneRef.current;
    const relance = awaitingRelanceRef.current;

    console.log("[VOICE] PROCESS_INPUT:", JSON.stringify(text), "stepIdx:", currentIdx, "done:", done, "relance:", relance);

    if (!text || done) { setMicState("idle"); return; }
    addMsg("user", text);
    setInputText("");

    const step = SAISIE_STEPS[currentIdx];
    if (!step) {
      console.log("[VOICE] NO_STEP at index:", currentIdx, "→ idle");
      setMicState("idle");
      return;
    }

    // ── Count / money fields ─────────────────────────────────────────
    if (step.inputMode === "count" || step.inputMode === "money") {
      const norm = normalize(text);
      const fullResult = parseNumericResponse(text);
      const parsed = parseCountField(text);
      console.log("[VOICE] STT_RAW:", JSON.stringify(text));
      console.log("[VOICE] STT_NORMALIZED:", JSON.stringify(norm));
      console.log("[VOICE] PARSE_DECISION:", fullResult.decision, "type:", fullResult.type, fullResult.type === "number" ? "value:" + fullResult.value : "");
      console.log("[VOICE] PARSED_COUNT:", parsed, "field:", step.field);

      if (parsed === null) {
        if (!relance) {
          console.log("[VOICE] RELANCE for", step.field);
          setAwaitingRelance(true); awaitingRelanceRef.current = true;
          const q = "Combien ?";
          addMsg("assistant", q);
          doSpeak(q);
          setMicState("idle");
          return;
        }
        console.log("[VOICE] SECOND_FAIL → default 0 for", step.field);
        (fieldsRef.current as Record<string, number>)[step.field] = 0;
      } else {
        (fieldsRef.current as Record<string, number>)[step.field] = parsed;
      }

      setAwaitingRelance(false); awaitingRelanceRef.current = false;
      setMicState("idle");
      const next = getNextApplicableStep(currentIdx + 1, fieldsRef.current);
      console.log("[VOICE] NEXT_STEP:", next, next < SAISIE_STEPS.length ? SAISIE_STEPS[next].id : "DONE");
      askStep(next);
      return;
    }

    // ── Detail fields — parse + wait for user to confirm ──────────
    let parsedCount = 0;
    let expectedCount = 0;

    if (step.inputMode === "detail_mandats") {
      const mandats = parseMandatsText(text);
      expectedCount = fieldsRef.current.mandatsSignes ?? 0;
      parsedCount = mandats.length;
      arraysRef.current = { ...arraysRef.current, mandats: [...arraysRef.current.mandats, ...mandats.map(m => ({ ...m, nomVendeur: capitalizeFirst(m.nomVendeur) }))] };
      console.log("[VOICE] MANDATS_PARSED:", parsedCount, "expected:", expectedCount);
    } else if (step.inputMode === "detail_infos") {
      const infos = parseDetailsText(text);
      expectedCount = (fieldsRef.current as Record<string, number>)["infosVenteCount"] ?? 0;
      parsedCount = infos.length;
      arraysRef.current = { ...arraysRef.current, informationsVente: [...arraysRef.current.informationsVente, ...infos.map(d => ({ nom: capitalizeFirst(d.nom), commentaire: d.commentaire }))] };
      console.log("[VOICE] INFOS_PARSED:", parsedCount, "expected:", expectedCount);
    } else if (step.inputMode === "detail_acheteurs") {
      const acheteurs = parseDetailsText(text);
      expectedCount = fieldsRef.current.acheteursChaudsCount ?? 0;
      parsedCount = acheteurs.length;
      arraysRef.current = { ...arraysRef.current, acheteursChauds: [...arraysRef.current.acheteursChauds, ...acheteurs.map(d => ({ nom: capitalizeFirst(d.nom), commentaire: d.commentaire }))] };
      console.log("[VOICE] ACHETEURS_PARSED:", parsedCount, "expected:", expectedCount);
    }

    // Coherence check: if count mismatch, notify user
    if (expectedCount > 0 && parsedCount < expectedCount) {
      addMsg("assistant", `J'ai noté ${parsedCount} élément${parsedCount > 1 ? "s" : ""} sur ${expectedCount} annoncé${expectedCount > 1 ? "s" : ""}. Tu pourras compléter dans le résumé.`);
    }

    // Don't auto-advance on detail fields — wait for user to click "Suivant"
    setAwaitingDetailConfirm(true);
    setMicState("idle");
    console.log("[VOICE] DETAIL_AWAITING_CONFIRM");
  };

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    console.log("[VOICE] INIT");
    const greeting = `${firstName}, on fait le point.`;
    addMsg("assistant", greeting);
    doSpeak(greeting);
    setTimeout(() => {
      const first = getNextApplicableStep(0, fieldsRef.current);
      askStep(first);
    }, 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Text mode handlers ─────────────────────────────────────────────────
  const confirmDetailAndAdvance = () => {
    setAwaitingDetailConfirm(false);
    const currentIdx = stepIdxRef.current;
    const next = getNextApplicableStep(currentIdx + 1, fieldsRef.current);
    console.log("[VOICE] DETAIL_CONFIRMED → NEXT_STEP:", next, next < SAISIE_STEPS.length ? SAISIE_STEPS[next].id : "DONE");
    askStep(next);
  };

  const handleSend = () => { const t = inputText.trim(); if (!t || isDone) return; doProcessInput(t); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const handleFinish = () => { stopSpeaking(); onComplete(fieldsRef.current, arraysRef.current); };

  // ── Progress ────────────────────────────────────────────────────────────
  const currentStep = stepIdx >= 0 && stepIdx < SAISIE_STEPS.length ? SAISIE_STEPS[stepIdx] : null;
  const progressPct = stepIdx >= 0 ? Math.round(((stepIdx + 1) / SAISIE_STEPS.length) * 100) : 0;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10"><MessageCircle className="h-4 w-4 text-primary" /></div>
          <div>
            <p className="text-sm font-semibold text-foreground">NXT Assistant</p>
            <p className="text-xs text-muted-foreground">
              {isDone ? "Terminé" : isSpeaking ? "Parle…" : micState === "listening" ? "Écoute…"
                : currentStep ? `${currentStep.section} — ${stepIdx + 1}/${SAISIE_STEPS.length}` : "Prêt"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sttAvailable && (
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              <button type="button" onClick={() => { setVoiceMode(true); voiceModeRef.current = true; }} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors ${voiceMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><Mic className="h-3 w-3" />Voix</button>
              <button type="button" onClick={() => { setVoiceMode(false); voiceModeRef.current = false; stopListening(); stopSpeaking(); }} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors ${!voiceMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><Keyboard className="h-3 w-3" />Texte</button>
            </div>
          )}
          <button type="button" onClick={toggleMute} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>{msg.text}</div>
          </div>
        ))}
        {micState === "listening" && liveTranscript && (
          <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-primary/30 text-primary-foreground/70 rounded-br-md italic">{liveTranscript}</div></div>
        )}
        {micState === "processing" && (
          <div className="flex justify-start"><div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 rounded-bl-md"><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Traitement…</span></div></div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-border shrink-0">
        {awaitingDetailConfirm ? (
          <div className="flex flex-col items-center gap-3">
            <button type="button" onClick={confirmDetailAndAdvance} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              Suivant
            </button>
            <p className="text-xs text-muted-foreground">Vérifie ta réponse puis clique Suivant</p>
          </div>
        ) : isDone ? (
          <div className="flex flex-col items-center gap-3">
            <button type="button" onClick={handleFinish} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">Terminer et voir le résumé</button>
            <button type="button" onClick={onDismiss} className="text-xs text-muted-foreground" style={{ fontSize: 12 }}>Passer pour l&apos;instant</button>
          </div>
        ) : voiceMode ? (
          <div className="flex flex-col items-center gap-3 py-2">
            {micState === "listening" ? (
              <>
                {/* Listening: large red pulsing button with ring animation */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: "1.5s" }} />
                  <button type="button" onClick={stopListening} className="relative flex h-20 w-20 items-center justify-center rounded-full bg-red-500 text-white shadow-2xl shadow-red-500/40 transition-all hover:bg-red-600 active:scale-95 z-10">
                    <Mic className="h-8 w-8" />
                  </button>
                </div>
                <p className="text-sm font-medium text-red-400 animate-pulse">En écoute…</p>
              </>
            ) : micState === "processing" ? (
              <>
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted border-2 border-primary/30">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Traitement…</p>
              </>
            ) : isSpeaking ? (
              <>
                {/* TTS speaking: show pulsing sound indicator */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-muted border-2 border-primary/30">
                    <Volume2 className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                </div>
                <p className="text-sm font-medium text-primary/70">L&apos;assistant parle…</p>
              </>
            ) : (
              <>
                {/* Idle: ready to listen */}
                <button type="button" onClick={doStartListening} className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-105 active:scale-95">
                  <Mic className="h-8 w-8" />
                </button>
                <p className="text-sm font-medium text-muted-foreground">Appuie pour parler</p>
              </>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <input ref={inputRef} type="text" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={handleKeyDown} placeholder="Tape ta réponse…" autoFocus className="flex-1 rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" />
            <button type="button" onClick={handleSend} disabled={!inputText.trim()} className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"><Send className="h-4 w-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
