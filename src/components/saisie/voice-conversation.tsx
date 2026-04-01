"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, MessageCircle, Mic, Volume2, VolumeX, Keyboard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";
import { extractFromConversation } from "@/lib/saisie-ai-client";
import type { ExtractedFields, ExtractedArrays, MandatDetail, InfoVenteDetail, AcheteurDetail } from "@/lib/saisie-ai-client";

// ── Web Speech API types ─────────────────────────────────────────────────────

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

// ── Direct parsers for relance responses (no LLM) ───────────────────────────

const ZERO_WORDS = new Set(["zéro", "zero", "aucun", "aucune", "non", "rien", "pas", "0"]);

function parseNumberDirect(text: string): number {
  const lower = text.trim().toLowerCase();
  if (ZERO_WORDS.has(lower)) return 0;
  // "une douzaine" → 12, "une dizaine" → 10
  if (/douzaine/i.test(lower)) return 12;
  if (/dizaine/i.test(lower)) return 10;
  if (/quinzaine/i.test(lower)) return 15;
  if (/vingtaine/i.test(lower)) return 20;
  // French number words
  const wordMap: Record<string, number> = {
    un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5,
    six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
    onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15,
    seize: 16, vingt: 20, trente: 30,
  };
  for (const [word, val] of Object.entries(wordMap)) {
    if (lower === word || lower.startsWith(word + " ")) return val;
  }
  const match = lower.match(/[\d]+[\s.,]*[\d]*/);
  if (match) return parseFloat(match[0].replace(/[\s.]/g, "").replace(",", "."));
  return 0;
}

function parseMandatsDetail(text: string): MandatDetail[] {
  const lower = text.trim().toLowerCase();
  if (ZERO_WORDS.has(lower)) return [];
  const parts = text.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
  return parts.map(part => {
    const isExclusif = /exclusi|ME\b|MEx\b/i.test(part);
    const nom = part.replace(/\b(exclusi\w*|simple|MS|ME|MEx)\b/gi, "").trim();
    return { nomVendeur: nom, type: isExclusif ? "exclusif" as const : "simple" as const };
  });
}

function parseInfosVenteDetail(text: string): InfoVenteDetail[] {
  const lower = text.trim().toLowerCase();
  if (ZERO_WORDS.has(lower)) return [];
  return text.split(/[,;]+/).map(s => {
    const trimmed = s.trim();
    const spaceIdx = trimmed.indexOf(" ");
    if (spaceIdx > 0) {
      return { nom: trimmed.slice(0, spaceIdx), commentaire: trimmed.slice(spaceIdx + 1) };
    }
    return { nom: trimmed, commentaire: "" };
  }).filter(v => v.nom);
}

function parseAcheteursDetail(text: string): AcheteurDetail[] {
  const lower = text.trim().toLowerCase();
  if (ZERO_WORDS.has(lower)) return [];
  return text.split(/[,;]+/).map(s => {
    const trimmed = s.trim();
    const spaceIdx = trimmed.indexOf(" ");
    if (spaceIdx > 0) {
      return { nom: trimmed.slice(0, spaceIdx), commentaire: trimmed.slice(spaceIdx + 1) };
    }
    return { nom: trimmed, commentaire: "" };
  }).filter(v => v.nom);
}

// ── Block definitions (17 champs complets) ───────────────────────────────────

type BlockId = "prospection" | "vendeurs" | "acheteurs" | "ventes";

interface Relance {
  field: string;
  question: string;
  /** Only ask if condition returns true (default: always ask) */
  condition?: (fields: ExtractedFields, arrays: ExtractedArrays) => boolean;
  /** "number" = parse as number, "mandats_detail" etc. = parse as structured array */
  parseMode: "number" | "text" | "mandats_detail" | "infos_vente_detail" | "acheteurs_detail";
}

interface Block {
  id: BlockId;
  label: string;
  amorce: (firstName: string) => string;
  targetFields: string[];
  relances: Relance[];
}

const BLOCKS: Block[] = [
  {
    id: "prospection",
    label: "Prospection",
    amorce: (name) =>
      `${name}, on démarre. Cette semaine en prospection : tu as eu combien de contacts au total, et combien venaient de tes portails ou vitrine ?`,
    targetFields: ["contactsTotaux", "contactsEntrants", "rdvEstimation"],
    relances: [
      { field: "contactsEntrants", question: "Et parmi eux, combien étaient entrants (portails, vitrine) ?", parseMode: "number" },
      { field: "rdvEstimation", question: "Tu as décroché des RDV estimation ?", parseMode: "number" },
      {
        field: "infosVente_detail",
        question: "Des infos de vente à noter — projets vendeurs pas encore en RDV ? Donne-moi les noms et le contexte.",
        parseMode: "infos_vente_detail",
      },
    ],
  },
  {
    id: "vendeurs",
    label: "Vendeurs",
    amorce: () =>
      "Côté vendeurs. Combien d'estimations réalisées, et tu as signé des mandats ? Donne-moi le nombre et le type (exclusif/simple).",
    targetFields: ["estimationsRealisees", "mandatsSignes", "rdvSuivi", "requalificationSimpleExclusif", "baissePrix"],
    relances: [
      {
        field: "mandats_detail",
        question: "Donne-moi les noms et le type pour chaque mandat (ex: Dupont exclusif, Martin simple).",
        condition: (f) => (f.mandatsSignes ?? 0) > 0,
        parseMode: "mandats_detail",
      },
      { field: "rdvSuivi", question: "Des RDV de suivi avec des vendeurs en cours ?", parseMode: "number" },
      { field: "requalificationSimpleExclusif", question: "Une requalification simple → exclusif ?", parseMode: "number" },
      { field: "baissePrix", question: "Une baisse de prix acceptée ?", parseMode: "number" },
    ],
  },
  {
    id: "acheteurs",
    label: "Acheteurs",
    amorce: () =>
      "Les acheteurs. De nouveaux acheteurs chauds cette semaine ? Et combien de visites ?",
    targetFields: ["acheteursChaudsCount", "acheteursSortisVisite", "nombreVisites", "offresRecues", "compromisSignes"],
    relances: [
      {
        field: "acheteurs_detail",
        question: "Donne-moi les noms et leur projet.",
        condition: (f) => (f.acheteursChaudsCount ?? 0) > 0,
        parseMode: "acheteurs_detail",
      },
      { field: "acheteursSortisVisite", question: "Combien d'acheteurs distincts en visite, et combien de visites au total ?", parseMode: "number" },
      { field: "offresRecues", question: "Des offres reçues ?", parseMode: "number" },
      { field: "compromisSignes", question: "Des compromis signés ?", parseMode: "number" },
    ],
  },
  {
    id: "ventes",
    label: "Ventes",
    amorce: () => "Pour finir, les ventes. Des actes signés cette semaine ?",
    targetFields: ["actesSignes", "chiffreAffaires", "delaiMoyenVente"],
    relances: [
      {
        field: "chiffreAffaires",
        question: "Quel CA sur ces actes ?",
        condition: (f) => (f.actesSignes ?? 0) > 0,
        parseMode: "number",
      },
      {
        field: "delaiMoyenVente",
        question: "Délai moyen entre compromis et acte sur ces ventes ? (en jours, 0 si tu ne sais pas)",
        condition: (f) => (f.actesSignes ?? 0) > 0,
        parseMode: "number",
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

function speakTTS(text: string, onEnd?: () => void): void {
  if (typeof window === "undefined" || !window.speechSynthesis) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const doSpeak = () => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR"; u.rate = 0.92; u.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const fr = voices.filter(v => v.lang === "fr-FR" || v.lang.startsWith("fr-"));
    const PREF = ["Google français","Google French","Amélie","Thomas","Microsoft Paul Online","Microsoft Hortense Online","fr-FR-DeniseNeural","fr-FR-HenriNeural"];
    let sel: SpeechSynthesisVoice | undefined;
    for (const n of PREF) { sel = fr.find(v => v.name.includes(n)); if (sel) break; }
    if (!sel) sel = fr[0]; if (!sel && voices.length) sel = voices[0];
    if (sel) u.voice = sel;
    u.onend = () => onEnd?.(); u.onerror = () => onEnd?.();
    window.speechSynthesis.speak(u);
  };
  if (window.speechSynthesis.getVoices().length > 0) { doSpeak(); }
  else { window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; doSpeak(); }; setTimeout(doSpeak, 500); }
}

function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
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

  // Conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [blockIdx, setBlockIdx] = useState(0);
  const [inputText, setInputText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // REFS for latest values (avoids stale closures)
  const fieldsRef = useRef<ExtractedFields>({});
  const arraysRef = useRef<ExtractedArrays>({ mandats: [], informationsVente: [], acheteursChauds: [] });
  const blockIdxRef = useRef(0);
  const askedRelancesRef = useRef<Set<string>>(new Set());
  const currentRelanceFieldRef = useRef<Relance | null>(null);
  const initRef = useRef(false);

  // State mirrors (for rendering)
  const [fields, setFields] = useState<ExtractedFields>({});
  const [arrays, setArrays] = useState<ExtractedArrays>({ mandats: [], informationsVente: [], acheteursChauds: [] });

  // Draft
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [draftData, setDraftData] = useState<{
    fields: ExtractedFields; arrays: ExtractedArrays; lastBlock: BlockId;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Sync helpers ────────────────────────────────────────────────────────
  const updateFields = useCallback((next: ExtractedFields) => {
    fieldsRef.current = next;
    setFields(next);
  }, []);

  const updateArrays = useCallback((next: ExtractedArrays) => {
    arraysRef.current = next;
    setArrays(next);
  }, []);

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem("nxt-voice-muted", String(next));
      if (next) stopSpeaking();
      return next;
    });
  };

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, liveTranscript]);
  useEffect(() => { if (!isExtracting && !voiceMode) inputRef.current?.focus(); }, [isExtracting, messages, voiceMode]);
  useEffect(() => { return () => { stopSpeaking(); recognitionRef.current?.abort(); if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current); }; }, []);

  // ── TTS ──────────────────────────────────────────────────────────────────
  const speakText = useCallback((text: string) => {
    if (muted || !voiceMode) return;
    setIsSpeaking(true);
    speakTTS(text, () => { setIsSpeaking(false); if (voiceMode) startListening(); });
  }, [muted, voiceMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── STT ──────────────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;
    stopSpeaking(); setIsSpeaking(false); setMicState("listening"); setLiveTranscript("");
    const recognition = new SR();
    recognition.lang = "fr-FR"; recognition.continuous = false; recognition.interimResults = true;
    let finalTranscript = "";
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += (finalTranscript ? " " : "") + t.trim();
        else interim = t;
      }
      setLiveTranscript(finalTranscript + (interim ? " " + interim : ""));
      silenceTimerRef.current = setTimeout(() => recognition.stop(), 10000);
    };
    recognition.onend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      const text = finalTranscript.trim();
      if (text) { setMicState("processing"); setLiveTranscript(""); processUserInput(text); }
      else { setMicState("idle"); setLiveTranscript(""); }
    };
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (e.error === "not-allowed" || e.error === "permission-denied") {
        setVoiceMode(false); setMicState("idle"); setLiveTranscript("");
        setMessages(prev => [...prev, { role: "assistant", text: "Micro non disponible, passage en mode texte." }]);
        return;
      }
      setMicState("idle"); setLiveTranscript("");
    };
    recognitionRef.current = recognition;
    silenceTimerRef.current = setTimeout(() => recognition.stop(), 10000);
    try { recognition.start(); } catch { setMicState("idle"); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = () => { if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current); recognitionRef.current?.stop(); };

  // ── Start a block ────────────────────────────────────────────────────────
  const startBlock = useCallback((idx: number) => {
    if (idx >= BLOCKS.length) {
      const t = "C'est tout ! Je récapitule. Vérifie et enregistre.";
      setMessages(prev => [...prev, { role: "assistant", text: t }]);
      setIsDone(true);
      speakText(t);
      return;
    }
    const block = BLOCKS[idx];
    const text = block.amorce(firstName);
    setBlockIdx(idx);
    blockIdxRef.current = idx;
    askedRelancesRef.current = new Set();
    currentRelanceFieldRef.current = null;
    setMessages(prev => [...prev, { role: "assistant", text }]);
    speakText(text);
  }, [firstName, speakText]);

  // ── Draft ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (isDemo || !user?.id) { startBlock(0); return; }
    const checkDraft = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("voice_drafts").select("*")
        .eq("user_id", user.id).gt("expires_at", new Date().toISOString())
        .order("updated_at", { ascending: false }).limit(1);
      if (data && data.length > 0) {
        const draft = data[0];
        const pd = draft.partial_data as { fields?: ExtractedFields; arrays?: ExtractedArrays } | null;
        if (pd && draft.last_block) {
          setDraftData({ fields: pd.fields || {}, arrays: pd.arrays || { mandats: [], informationsVente: [], acheteursChauds: [] }, lastBlock: draft.last_block as BlockId });
          setShowDraftPrompt(true);
          return;
        }
      }
      startBlock(0);
    };
    checkDraft();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumeDraft = () => {
    if (!draftData) return;
    updateFields(draftData.fields); updateArrays(draftData.arrays);
    setShowDraftPrompt(false);
    const nextIdx = BLOCK_ORDER.indexOf(draftData.lastBlock) + 1;
    const t = `On reprend où tu t'étais arrêté — j'ai déjà tes données de ${BLOCK_ORDER.slice(0, nextIdx).join(", ")}.`;
    setMessages([{ role: "assistant", text: t }]);
    speakText(t);
    setTimeout(() => startBlock(nextIdx), 500);
  };

  const restartFresh = () => { setShowDraftPrompt(false); setDraftData(null); startBlock(0); };

  const saveDraft = useCallback(async (cf: ExtractedFields, ca: ExtractedArrays, lb: BlockId) => {
    if (isDemo || !user?.id) return;
    const supabase = createClient();
    await supabase.from("voice_drafts").delete().eq("user_id", user.id);
    await supabase.from("voice_drafts").insert({
      user_id: user.id, period_start: getMonthStart(),
      partial_data: { fields: cf, arrays: ca }, last_block: lb, expires_at: getSundayExpiry(),
    });
  }, [isDemo, user?.id]);

  // ── Process user input ─────────────────────────────────────────────────
  const processUserInput = useCallback(async (text: string) => {
    if (!text) { setMicState("idle"); return; }

    setMessages(prev => [...prev, { role: "user", text }]);
    setInputText("");
    setIsExtracting(true);

    const idx = blockIdxRef.current;
    const block = BLOCKS[idx];
    let currentFields = { ...fieldsRef.current };
    let currentArrays = { ...arraysRef.current };

    // ── CORRECTION 1: Direct parse if responding to a relance ────────────
    const relance = currentRelanceFieldRef.current;
    if (relance) {
      currentRelanceFieldRef.current = null;

      switch (relance.parseMode) {
        case "number": {
          const val = parseNumberDirect(text);
          (currentFields as Record<string, number>)[relance.field] = val;
          break;
        }
        case "mandats_detail": {
          const details = parseMandatsDetail(text);
          currentArrays = { ...currentArrays, mandats: [...currentArrays.mandats, ...details] };
          break;
        }
        case "infos_vente_detail": {
          const details = parseInfosVenteDetail(text);
          currentArrays = { ...currentArrays, informationsVente: [...currentArrays.informationsVente, ...details] };
          break;
        }
        case "acheteurs_detail": {
          const details = parseAcheteursDetail(text);
          currentArrays = { ...currentArrays, acheteursChauds: [...currentArrays.acheteursChauds, ...details] };
          break;
        }
        case "text":
        default:
          break;
      }

      updateFields(currentFields);
      updateArrays(currentArrays);

      // Check for more relances in this block
      const asked = askedRelancesRef.current;
      const nextRelance = block.relances.find(r => {
        if (asked.has(r.field)) return false;
        if (r.parseMode === "number") {
          const v = (currentFields as Record<string, number | undefined>)[r.field];
          if (v !== undefined) return false;
        }
        return !r.condition || r.condition(currentFields, currentArrays);
      });

      if (nextRelance) {
        asked.add(nextRelance.field);
        currentRelanceFieldRef.current = nextRelance;
        setMessages(prev => [...prev, { role: "assistant", text: nextRelance.question }]);
        setIsExtracting(false);
        setMicState("idle");
        speakText(nextRelance.question);
        return;
      }

      // Block complete
      await saveDraft(currentFields, currentArrays, block.id);
      setIsExtracting(false);
      setMicState("idle");
      startBlock(idx + 1);
      return;
    }

    // ── Normal LLM extraction (first response to amorce) ─────────────────
    const result = await extractFromConversation(text, currentFields, block.targetFields);

    // Merge
    for (const [key, value] of Object.entries(result.extracted)) {
      if (value !== undefined && value !== null) {
        (currentFields as Record<string, number>)[key] = value as number;
      }
    }
    currentArrays = {
      mandats: [...currentArrays.mandats, ...result.arrays.mandats],
      informationsVente: [...currentArrays.informationsVente, ...result.arrays.informationsVente],
      acheteursChauds: [...currentArrays.acheteursChauds, ...result.arrays.acheteursChauds],
    };
    updateFields(currentFields);
    updateArrays(currentArrays);

    // Check for relances
    const asked = askedRelancesRef.current;
    const nextRelance = block.relances.find(r => {
      if (asked.has(r.field)) return false;
      // For number fields, skip if already filled
      if (r.parseMode === "number") {
        const v = (currentFields as Record<string, number | undefined>)[r.field];
        if (v !== undefined) return false;
      }
      // For detail fields, skip if arrays already have data
      if (r.parseMode === "mandats_detail" && currentArrays.mandats.length > 0) return false;
      if (r.parseMode === "infos_vente_detail" && currentArrays.informationsVente.length > 0) return false;
      if (r.parseMode === "acheteurs_detail" && currentArrays.acheteursChauds.length > 0) return false;
      return !r.condition || r.condition(currentFields, currentArrays);
    });

    if (nextRelance) {
      asked.add(nextRelance.field);
      currentRelanceFieldRef.current = nextRelance;
      setMessages(prev => [...prev, { role: "assistant", text: nextRelance.question }]);
      setIsExtracting(false);
      setMicState("idle");
      speakText(nextRelance.question);
      return;
    }

    // Block complete
    await saveDraft(currentFields, currentArrays, block.id);
    setIsExtracting(false);
    setMicState("idle");
    startBlock(idx + 1);
  }, [updateFields, updateArrays, saveDraft, startBlock, speakText]);

  // ── Text mode handlers ───────────────────────────────────────────────────
  const handleSend = () => { const t = inputText.trim(); if (!t || isExtracting || isDone) return; processUserInput(t); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const handleFinish = () => { stopSpeaking(); onComplete(fieldsRef.current, arraysRef.current); };

  // ── Draft prompt ─────────────────────────────────────────────────────────
  if (showDraftPrompt) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative z-10 flex max-w-md flex-col items-center gap-6 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"><MessageCircle className="h-7 w-7 text-primary" /></div>
          <h2 className="text-xl font-bold text-foreground">Tu avais commencé une saisie</h2>
          <p className="text-sm text-muted-foreground">On reprend là où tu t&apos;étais arrêté ?</p>
          <div className="flex gap-3 w-full">
            <button onClick={restartFresh} className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors">Recommencer</button>
            <button onClick={resumeDraft} className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">Reprendre</button>
          </div>
          <button onClick={onDismiss} className="text-xs text-muted-foreground transition-colors hover:text-muted-foreground/70" style={{ fontSize: 12 }}>Passer pour l&apos;instant</button>
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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10"><MessageCircle className="h-4 w-4 text-primary" /></div>
          <div>
            <p className="text-sm font-semibold text-foreground">NXT Assistant</p>
            <p className="text-xs text-muted-foreground">
              {isDone ? "Terminé" : isSpeaking ? "En train de parler…" : micState === "listening" ? "En écoute…"
                : currentBlock ? `${currentBlock.label} — ${blockIdx + 1} / ${BLOCKS.length}` : "Prêt"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sttAvailable && (
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              <button onClick={() => setVoiceMode(true)} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors ${voiceMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}><Mic className="h-3 w-3" />Voix</button>
              <button onClick={() => { setVoiceMode(false); stopListening(); stopSpeaking(); }} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors ${!voiceMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}><Keyboard className="h-3 w-3" />Texte</button>
            </div>
          )}
          <button onClick={toggleMute} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <div className="flex gap-1 ml-1">
            {BLOCKS.map((b, i) => (<div key={b.id} className={`h-1.5 w-6 rounded-full transition-colors ${i < blockIdx ? "bg-primary" : i === blockIdx ? "bg-primary/50" : "bg-muted"}`} />))}
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
          <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed bg-primary/30 text-primary-foreground/70 rounded-br-md italic">{liveTranscript}</div></div>
        )}
        {(isExtracting || micState === "processing") && (
          <div className="flex justify-start"><div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 rounded-bl-md"><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Analyse…</span></div></div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 border-t border-border shrink-0">
        {isDone ? (
          <div className="flex flex-col items-center gap-3">
            <button onClick={handleFinish} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">Terminer et voir le résumé</button>
            <button onClick={onDismiss} className="text-xs text-muted-foreground transition-colors hover:text-muted-foreground/70" style={{ fontSize: 12 }}>Passer pour l&apos;instant</button>
          </div>
        ) : voiceMode ? (
          <div className="flex flex-col items-center gap-2">
            {micState === "listening" ? (
              <><button onClick={stopListening} className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-xl shadow-red-500/30 animate-pulse transition-all hover:bg-red-600"><Mic className="h-7 w-7" /></button><p className="text-xs text-muted-foreground">En écoute… appuie pour terminer</p></>
            ) : micState === "processing" ? (
              <><div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div><p className="text-xs text-muted-foreground">Analyse en cours…</p></>
            ) : (
              <><button onClick={startListening} disabled={isExtracting || isSpeaking} className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"><Mic className="h-7 w-7" /></button><p className="text-xs text-muted-foreground">{isSpeaking ? "L'assistant parle…" : "Appuie pour parler"}</p></>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <input ref={inputRef} type="text" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={handleKeyDown} disabled={isExtracting} placeholder="Tape ta réponse…" autoFocus className="flex-1 rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50" />
            <button onClick={handleSend} disabled={isExtracting || !inputText.trim()} className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
