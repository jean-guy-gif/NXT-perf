"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/app-store";
import { extractFromConversation } from "@/lib/saisie-ai-client";
import { ImportConfirmation } from "@/components/saisie/import-confirmation";
import type { ExtractedFields, ExtractedArrays, MandatDetail, InfoVenteDetail, AcheteurDetail } from "@/lib/saisie-ai-client";

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

// ── Props ────────────────────────────────────────────────────────────────────

interface VoiceConversationProps {
  onDismiss: () => void;
  onComplete: (fields: ExtractedFields, arrays: ExtractedArrays) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function VoiceConversation({ onDismiss, onComplete }: VoiceConversationProps) {
  const user = useAppStore((s) => s.user);
  const isDemo = useAppStore((s) => s.isDemo);
  const firstName = user?.firstName || "Conseiller";

  // State
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

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isExtracting) inputRef.current?.focus();
  }, [isExtracting, messages]);

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
      // All done
      const closingMsg: ChatMessage = {
        role: "assistant",
        text: "C'est tout ! Je récapitule. Vérifie et enregistre.",
      };
      setMessages((prev) => [...prev, closingMsg]);
      setIsDone(true);
      return;
    }

    const block = BLOCKS[idx];
    const amorceMsg: ChatMessage = {
      role: "assistant",
      text: block.amorce(firstName),
    };
    setBlockIdx(idx);
    setRelanceIdx(0);
    setInRelance(false);
    setMessages((prev) => [...prev, amorceMsg]);
  }, [firstName]);

  // ── Resume draft ─────────────────────────────────────────────────────────

  const resumeDraft = () => {
    if (!draftData) return;
    setFields(draftData.fields);
    setArrays(draftData.arrays);
    setShowDraftPrompt(false);

    const lastIdx = BLOCK_ORDER.indexOf(draftData.lastBlock);
    const nextIdx = lastIdx + 1;

    const resumeMsg: ChatMessage = {
      role: "assistant",
      text: `On reprend où tu t'étais arrêté — j'ai déjà tes données de ${BLOCK_ORDER.slice(0, lastIdx + 1).join(", ")}.`,
    };
    setMessages([resumeMsg]);
    startBlock(nextIdx);
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

    // Upsert: delete old drafts for this user, insert new
    await supabase
      .from("voice_drafts")
      .delete()
      .eq("user_id", user.id);

    await supabase
      .from("voice_drafts")
      .insert({
        user_id: user.id,
        period_start: periodStart,
        partial_data: { fields: currentFields, arrays: currentArrays },
        last_block: lastBlock,
        expires_at: getSundayExpiry(),
      });
  }, [isDemo, user?.id]);

  // ── Merge extraction result into accumulated data ────────────────────────

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

  // ── Process user message ─────────────────────────────────────────────────

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isExtracting || isDone) return;

    const userMsg: ChatMessage = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsExtracting(true);

    const block = BLOCKS[blockIdx];

    // Extract data from user response
    const result = await extractFromConversation(text, fields, block.targetFields);
    mergeResult(result);

    // Get updated fields after merge
    const updatedFields: ExtractedFields = { ...fields };
    for (const [key, value] of Object.entries(result.extracted)) {
      if (value !== undefined && value !== null) {
        (updatedFields as Record<string, number>)[key] = value as number;
      }
    }

    // Check for missing fields that need relance
    if (!inRelance) {
      // Find first missing relance field
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
        return;
      }
    }

    // Block complete → save draft and move to next
    await saveDraft(updatedFields, {
      ...arrays,
      mandats: [...arrays.mandats, ...result.arrays.mandats],
      informationsVente: [...arrays.informationsVente, ...result.arrays.informationsVente],
      acheteursChauds: [...arrays.acheteursChauds, ...result.arrays.acheteursChauds],
    }, block.id);

    setIsExtracting(false);
    startBlock(blockIdx + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Handle completion → show ImportConfirmation ──────────────────────────

  const handleFinish = () => {
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
          <h2 className="text-xl font-bold text-foreground">
            Tu avais commencé une saisie
          </h2>
          <p className="text-sm text-muted-foreground">
            On reprend là où tu t&apos;étais arrêté ?
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={restartFresh}
              className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Recommencer
            </button>
            <button
              onClick={resumeDraft}
              className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Reprendre
            </button>
          </div>
          <button
            onClick={onDismiss}
            className="text-xs text-muted-foreground transition-colors hover:text-muted-foreground/70"
            style={{ fontSize: 12 }}
          >
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
                : currentBlock
                  ? `${currentBlock.label} — ${blockIdx + 1} / ${BLOCKS.length}`
                  : "Prêt"}
            </p>
          </div>
        </div>

        {/* Block progress */}
        <div className="flex gap-1">
          {BLOCKS.map((b, i) => (
            <div
              key={b.id}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                i < blockIdx ? "bg-primary" : i === blockIdx ? "bg-primary/50" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isExtracting && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 rounded-bl-md">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Analyse…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input or Finish */}
      <div className="px-4 pb-4 pt-2 border-t border-border shrink-0">
        {isDone ? (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleFinish}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Terminer et voir le résumé
            </button>
            <button
              onClick={onDismiss}
              className="text-xs text-muted-foreground transition-colors hover:text-muted-foreground/70"
              style={{ fontSize: 12 }}
            >
              Passer pour l&apos;instant
            </button>
          </div>
        ) : (
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
              {isExtracting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
