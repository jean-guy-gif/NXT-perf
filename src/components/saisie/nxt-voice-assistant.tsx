"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic, MicOff, X, Volume2, VolumeX, CheckCircle,
  Loader2, Upload, Sparkles, RotateCcw, Send, Square, AlertCircle
} from "lucide-react";
import { extractFromText, extractFromImage, extractFromDocument, speak, stopSpeaking, type ExtractedFields } from "@/lib/saisie-ai-client";

// ─── Types ────────────────────────────────────────────────────────────────────

type AssistantScreen = "idle" | "recording" | "analyzing" | "missing" | "confirmation" | "done";

export interface MandatDetail   { nomVendeur: string; type: "simple" | "exclusif"; }
export interface InfoVenteDetail { nom: string; commentaire: string; }
export interface AcheteurDetail  { nom: string; commentaire: string; }

export interface StructuredDetails {
  mandats:     MandatDetail[];
  infoVentes:  InfoVenteDetail[];
  acheteurs:   AcheteurDetail[];
}

interface NxtVoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onFieldsExtracted: (fields: ExtractedFields, details?: StructuredDetails) => void;
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
  { title: "Prospection",           fields: ["contactsEntrants","contactsTotaux","rdvEstimation"] },
  { title: "Estimations & Mandats", fields: ["estimationsRealisees","mandatsSignes","rdvSuivi","requalification","baissePrix"] },
  { title: "Acheteurs & Visites",   fields: ["acheteursChaudsCount","acheteursSortisVisite","nombreVisites","offresRecues","compromisSignes"] },
  { title: "Ventes & CA",           fields: ["actesSignes","chiffreAffaires"] },
] as const;

// ─── Composant ────────────────────────────────────────────────────────────────

export function NxtVoiceAssistant({ isOpen, onClose, onFieldsExtracted, isMandatory = false }: NxtVoiceAssistantProps) {

  const [screen, setScreen]           = useState<AssistantScreen>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [fullTranscript, setFullTranscript] = useState("");
  const [extracted, setExtracted]     = useState<ExtractedFields>({});
  const [confirmed, setConfirmed]     = useState<ExtractedFields>({});
  const [details, setDetails]         = useState<StructuredDetails>({ mandats: [], infoVentes: [], acheteurs: [] });
  const [missingMsg, setMissingMsg]   = useState("");
  const [followUpQ, setFollowUpQ]     = useState("");
  const [voiceMuted, setVoiceMuted]   = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [importDesc, setImportDesc]   = useState("");
  const [textInput, setTextInput]     = useState("");
  const [micError, setMicError]       = useState("");
  const [followUpText, setFollowUpText] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef    = useRef<any>(null);
  const isRecordingRef    = useRef(false);
  const accumulatedRef    = useRef("");
  const fileInputRef      = useRef<HTMLInputElement>(null);
  const retryCountRef     = useRef(0);

  // suppress unused vars
  void fullTranscript;
  void MicOff;
  void followUpQ;

  const say = useCallback((text: string) => {
    if (!voiceMuted) { setIsSpeaking(true); speak(text, () => setIsSpeaking(false)); }
  }, [voiceMuted]);

  // ── Reset à l'ouverture ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setScreen("idle");
    setLiveTranscript("");
    setFullTranscript("");
    setExtracted({});
    setConfirmed({});
    setDetails({ mandats: [], infoVentes: [], acheteurs: [] });
    setMissingMsg("");
    setFollowUpQ("");
    setTextInput("");
    setMicError("");
    setFollowUpText("");
    accumulatedRef.current = "";
    isRecordingRef.current = false;
    retryCountRef.current = 0;
  }, [isOpen]);

  // ── Cleanup recognition on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  // ── Enregistrement continu ────────────────────────────────────────────────
  const startRecording = (keepAccumulated = false) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setMicError("Reconnaissance vocale non disponible. Utilisez Chrome ou Edge.");
      say("Reconnaissance vocale non disponible. Utilisez Chrome ou Edge.");
      return;
    }

    stopSpeaking();
    setIsSpeaking(false);
    setMicError("");
    if (!keepAccumulated) {
      accumulatedRef.current = "";
      setLiveTranscript("");
      setFullTranscript("");
    }
    retryCountRef.current = 0;
    isRecordingRef.current = true;
    setScreen("recording");

    const startRec = () => {
      if (!isRecordingRef.current) return;
      const r = new SR();
      r.lang = "fr-FR";
      r.continuous = true;
      r.interimResults = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      r.onresult = (e: any) => {
        retryCountRef.current = 0; // Reset on successful result
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            accumulatedRef.current += (accumulatedRef.current ? " " : "") + t.trim();
          } else {
            interim = t;
          }
        }
        setLiveTranscript(accumulatedRef.current + (interim ? " " + interim : ""));
      };
      r.onend = () => {
        if (isRecordingRef.current) {
          retryCountRef.current++;
          if (retryCountRef.current > 10) {
            // Too many silent restarts — likely a browser issue
            setMicError("Le micro semble inactif. Vérifiez les permissions de votre navigateur.");
            isRecordingRef.current = false;
            setScreen("idle");
            return;
          }
          setTimeout(startRec, 200);
        }
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      r.onerror = (e: any) => {
        const errorType = e?.error || "unknown";
        if (errorType === "not-allowed" || errorType === "permission-denied") {
          setMicError("Accès au microphone refusé. Autorisez le micro dans les paramètres de votre navigateur.");
          isRecordingRef.current = false;
          setScreen("idle");
          return;
        }
        if (errorType === "no-speech") {
          // No speech detected — just restart silently
          if (isRecordingRef.current) { setTimeout(startRec, 300); }
          return;
        }
        if (isRecordingRef.current) { setTimeout(startRec, 500); }
      };
      recognitionRef.current = r;
      try {
        r.start();
      } catch {
        // Already started or browser error
        setTimeout(startRec, 500);
      }
    };

    startRec();
  };

  const stopAndAnalyze = async () => {
    isRecordingRef.current = false;
    recognitionRef.current?.stop();
    const text = accumulatedRef.current || textInput;
    if (!text.trim()) { setScreen("idle"); return; }
    setFullTranscript(text);
    setLiveTranscript("");
    setScreen("analyzing");
    await analyzeText(text, extracted);
  };

  // ── Analyse (avec fusion des résultats précédents) ────────────────────────
  const analyzeText = async (text: string, previousFields: ExtractedFields) => {
    try {
      const result = await extractFromText(text, previousFields);
      const newExt = result?.extracted ?? {};

      // Fusionner : les nouvelles valeurs complètent les anciennes
      const merged: ExtractedFields = { ...previousFields };
      for (const [key, value] of Object.entries(newExt)) {
        if (value !== undefined && value !== null) {
          (merged as Record<string, number>)[key] = value as number;
        }
      }

      setExtracted(merged);
      setConfirmed(merged);

      const nbMandats    = merged.mandatsSignes     || 0;
      const nbAcheteurs  = merged.acheteursChaudsCount || 0;
      const nbInfoVentes = merged.rdvEstimation     || 0;

      // Ne recréer les détails que si le nombre a changé
      setDetails(prev => ({
        mandats:    prev.mandats.length === nbMandats ? prev.mandats : Array.from({ length: nbMandats }, (_, i) => prev.mandats[i] || { nomVendeur: "", type: "simple" as const }),
        acheteurs:  prev.acheteurs.length === nbAcheteurs ? prev.acheteurs : Array.from({ length: nbAcheteurs }, (_, i) => prev.acheteurs[i] || { nom: "", commentaire: "" }),
        infoVentes: prev.infoVentes.length === nbInfoVentes ? prev.infoVentes : Array.from({ length: nbInfoVentes }, (_, i) => prev.infoVentes[i] || { nom: "", commentaire: "" }),
      }));

      const important: (keyof ExtractedFields)[] = ["contactsTotaux", "estimationsRealisees", "mandatsSignes", "compromisSignes", "chiffreAffaires"];
      const missing = important.filter(f => merged[f] === undefined);
      const needDetails = nbMandats > 0 || nbAcheteurs > 0;
      const aiQuestion = result?.followUpQuestion || "";

      if (missing.length > 0 || needDetails) {
        // Utiliser la question IA si disponible, sinon construire un message
        let msg = "";
        if (aiQuestion) {
          msg = aiQuestion;
        } else if (missing.length > 0) {
          msg = `Il me manque : ${missing.map(f => FIELD_LABELS[f]).join(", ")}.`;
        }
        if (needDetails) {
          msg += (msg ? " " : "") + `J'ai aussi besoin des détails sur tes ${nbMandats > 0 ? `${nbMandats} mandats` : ""}${nbMandats > 0 && nbAcheteurs > 0 ? " et tes " : ""}${nbAcheteurs > 0 ? `${nbAcheteurs} acheteurs chauds` : ""}.`;
        }

        setMissingMsg(msg);
        setFollowUpQ(aiQuestion);
        say(msg);
        setScreen("missing");
      } else {
        setScreen("confirmation");
        say("J'ai tout ce qu'il me faut. Vérifie et valide tes chiffres.");
      }
    } catch {
      say("Une erreur est survenue. Réessaie.");
      setScreen("idle");
    }
  };

  // ── Répondre vocalement à la question de suivi ────────────────────────────
  const startFollowUpRecording = () => {
    stopSpeaking();
    setIsSpeaking(false);
    accumulatedRef.current = "";
    setLiveTranscript("");
    setFollowUpText("");
    startRecording(false);
  };

  const submitFollowUpText = async () => {
    const text = followUpText.trim();
    if (!text) return;
    setFollowUpText("");
    setScreen("analyzing");
    await analyzeText(text, extracted);
  };

  // ── Import fichier ────────────────────────────────────────────────────────
  const handleFileImport = async (file: File) => {
    setScreen("analyzing");
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isImage = file.type.startsWith("image/");
    const isPDF = ext === "pdf" || file.type === "application/pdf";
    const isExcel = ["xls","xlsx","xlsm","ods","csv"].includes(ext);
    const isWord = ["doc","docx","odt","txt"].includes(ext);

    try {
      if (isImage) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = (e.target?.result as string).split(",")[1];
          const mediaType = file.type as "image/jpeg"|"image/png"|"image/webp";
          try {
            const result = await extractFromImage(base64, mediaType);
            const ext = result?.extracted ?? {};
            setExtracted(ext); setConfirmed(ext);
            setImportDesc(result?.description || "Image analysée");
            setScreen("confirmation");
            say(`J'ai analysé votre image. ${result?.description || ""} Vérifiez et corrigez.`);
          } catch { say("Impossible de lire cette image."); setScreen("idle"); }
        };
        reader.readAsDataURL(file);
        return;
      }

      if (isPDF) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = (e.target?.result as string).split(",")[1];
          try {
            const result = await extractFromImage(base64, "application/pdf" as "image/jpeg");
            const ext = result?.extracted ?? {};
            setExtracted(ext); setConfirmed(ext);
            setImportDesc(result?.description || "PDF analysé");
            setScreen("confirmation");
            say(`J'ai analysé votre PDF. ${result?.description || ""} Vérifiez et corrigez.`);
          } catch { say("Impossible de lire ce PDF."); setScreen("idle"); }
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
        const excelExt = result?.extracted ?? {};
        setExtracted(excelExt); setConfirmed(excelExt);
        setImportDesc(result?.description || "Excel analysé");
        setScreen("confirmation");
        say(`J'ai analysé votre fichier. ${result?.description || ""} Vérifiez et corrigez.`);
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
        const docExt = result?.extracted ?? {};
        setExtracted(docExt); setConfirmed(docExt);
        setImportDesc(result?.description || "Document analysé");
        setScreen("confirmation");
        say(`J'ai analysé votre document. ${result?.description || ""} Vérifiez et corrigez.`);
        return;
      }

      say("Format non pris en charge. Utilisez image, PDF, Excel ou Word.");
      setScreen("idle");
    } catch (err) {
      console.error("handleFileImport error:", err);
      say("Erreur lors de l'analyse. Réessayez.");
      setScreen("idle");
    }
  };

  const handleConfirm = () => {
    onFieldsExtracted(confirmed, details);
    setScreen("done");
    say("Parfait. Vos données ont été appliquées. Pensez à sauvegarder.");
    setTimeout(() => { if (!isMandatory) onClose(); }, 2500);
  };

  if (!isOpen) return null;

  const btnPrimary = "flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors";
  const btnSecondary = "flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors";

  // ── Écran idle ─────────────────────────────────────────────────────────────
  const renderIdle = () => (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      {micError && (
        <div className="w-full rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {micError}
          </p>
        </div>
      )}
      <p className="text-center text-sm text-muted-foreground px-4">
        Raconte-moi ton activité et donne-moi tes chiffres. Parle librement — je t'écouterai jusqu'à ce que tu aies tout dit.
      </p>
      <button
        onClick={() => startRecording()}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all hover:scale-105"
      >
        <Mic className="h-8 w-8" />
      </button>
      <p className="text-xs text-muted-foreground">Appuyez pour commencer</p>

      <div className="flex items-center gap-3 w-full">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex gap-2 w-full">
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && textInput.trim()) { accumulatedRef.current = textInput; stopAndAnalyze(); } }}
          placeholder="Ou tapez directement vos chiffres…"
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {textInput.trim() && (
          <button
            onClick={() => { accumulatedRef.current = textInput; stopAndAnalyze(); }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 py-3 text-primary hover:bg-primary/10 transition-all"
      >
        <Upload className="h-5 w-5" />
        <span className="text-xs font-medium">Importer un document</span>
        <span className="text-[10px] text-primary/60">Image · PDF · Excel · Word</span>
      </button>
      <input ref={fileInputRef} type="file"
        accept="image/*,.pdf,.xls,.xlsx,.xlsm,.csv,.doc,.docx,.txt,.odt,.ods"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFileImport(e.target.files[0])} />
    </div>
  );

  // ── Écran enregistrement ───────────────────────────────────────────────────
  const renderRecording = () => (
    <div className="flex flex-col items-center justify-center gap-6 p-6 h-full">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm font-medium text-foreground">En écoute…</span>
      </div>

      <div className="w-full flex-1 rounded-xl border border-border bg-muted/30 p-4 overflow-y-auto min-h-[120px] max-h-[200px]">
        {liveTranscript
          ? <p className="text-sm text-foreground leading-relaxed">{liveTranscript}</p>
          : <p className="text-sm text-muted-foreground italic">Parlez… le texte apparaît ici en temps réel.</p>
        }
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Vous pouvez faire des pauses — l'enregistrement continue jusqu'à ce que vous appuyiez sur Terminer.
      </p>

      <button
        onClick={stopAndAnalyze}
        className="flex items-center gap-2 rounded-xl bg-red-500 px-6 py-3 text-sm font-semibold text-white hover:bg-red-600 transition-colors shadow-lg"
      >
        <Square className="h-4 w-4 fill-current" />
        Terminer et analyser
      </button>
    </div>
  );

  // ── Écran analyse ──────────────────────────────────────────────────────────
  const renderAnalyzing = () => (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm font-medium text-foreground">Analyse en cours…</p>
      <p className="text-xs text-muted-foreground">Je lis tes chiffres et identifie les informations manquantes.</p>
    </div>
  );

  // ── Écran manques + détails ────────────────────────────────────────────────
  const renderMissing = () => (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
          <p className="text-sm text-amber-700 dark:text-amber-400">{missingMsg}</p>
        </div>
      </div>

      {/* Zone de réponse vocale / texte pour compléter les données manquantes */}
      <div className="px-4 py-3 shrink-0 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Répondre</p>
        <div className="flex gap-2 items-center">
          <button
            onClick={startFollowUpRecording}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
            title="Répondre vocalement"
          >
            <Mic className="h-4 w-4" />
          </button>
          <input
            type="text"
            value={followUpText}
            onChange={(e) => setFollowUpText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && followUpText.trim()) submitFollowUpText(); }}
            placeholder="Ou tapez votre réponse ici…"
            className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {followUpText.trim() && (
            <button
              onClick={submitFollowUpText}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Résumé des champs déjà remplis */}
        {Object.keys(extracted).length > 0 && (
          <div className="rounded-lg bg-green-500/5 border border-green-500/20 px-3 py-2">
            <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-1">Déjà capturé :</p>
            <p className="text-xs text-green-600 dark:text-green-500">
              {Object.entries(extracted)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => `${FIELD_LABELS[k as keyof ExtractedFields] || k}: ${v}`)
                .join(" · ")}
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
        {details.mandats.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Détails mandats</p>
            {details.mandats.map((m, i) => (
              <div key={i} className="mb-2 rounded-xl border border-border bg-background p-3 space-y-2">
                <p className="text-xs font-medium text-foreground">Mandat {i + 1}</p>
                <input
                  type="text"
                  placeholder="Nom du vendeur"
                  value={m.nomVendeur}
                  onChange={(e) => {
                    const next = [...details.mandats];
                    next[i] = { ...next[i], nomVendeur: e.target.value };
                    setDetails(d => ({ ...d, mandats: next }));
                  }}
                  className="w-full rounded-lg border border-input bg-muted px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex gap-2">
                  {(["simple", "exclusif"] as const).map((t) => (
                    <button key={t}
                      onClick={() => {
                        const next = [...details.mandats];
                        next[i] = { ...next[i], type: t };
                        setDetails(d => ({ ...d, mandats: next }));
                      }}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                        m.type === t ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {details.acheteurs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Acheteurs chauds</p>
            {details.acheteurs.map((a, i) => (
              <div key={i} className="mb-2 rounded-xl border border-border bg-background p-3 space-y-2">
                <p className="text-xs font-medium text-foreground">Acheteur {i + 1}</p>
                <input
                  type="text"
                  placeholder="Nom de l'acheteur"
                  value={a.nom}
                  onChange={(e) => {
                    const next = [...details.acheteurs];
                    next[i] = { ...next[i], nom: e.target.value };
                    setDetails(d => ({ ...d, acheteurs: next }));
                  }}
                  className="w-full rounded-lg border border-input bg-muted px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
                <input
                  type="text"
                  placeholder="Commentaire (optionnel)"
                  value={a.commentaire}
                  onChange={(e) => {
                    const next = [...details.acheteurs];
                    next[i] = { ...next[i], commentaire: e.target.value };
                    setDetails(d => ({ ...d, acheteurs: next }));
                  }}
                  className="w-full rounded-lg border border-input bg-muted px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pb-4 flex gap-2 shrink-0">
        <button onClick={() => setScreen("confirmation")} className={btnSecondary + " flex-1"}>
          Passer
        </button>
        <button onClick={() => setScreen("confirmation")} className={btnPrimary + " flex-1"}>
          <CheckCircle className="h-4 w-4" />
          Continuer
        </button>
      </div>
    </div>
  );

  // ── Écran confirmation ─────────────────────────────────────────────────────
  const renderConfirmation = () => (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <p className="text-sm font-semibold text-foreground">
          {importDesc ? `📎 ${importDesc}` : "Vérification de vos données"}
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
                    type="number" min={0}
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

      <div className="px-4 pb-4 flex gap-2 shrink-0">
        <button
          onClick={() => { setScreen("idle"); setImportDesc(""); }}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted"
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

  // ── Écran done ─────────────────────────────────────────────────────────────
  const renderDone = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle className="h-7 w-7 text-green-500" />
      </div>
      <h2 className="text-lg font-bold text-foreground">Données appliquées</h2>
      <p className="text-sm text-muted-foreground">Pensez à sauvegarder votre saisie.</p>
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
                {screen === "recording" ? "🔴 En écoute…"
                  : screen === "analyzing" ? "Analyse…"
                  : isSpeaking ? "En train de parler…"
                  : "Prêt"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setVoiceMuted(!voiceMuted); stopSpeaking(); setIsSpeaking(false); }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              {voiceMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            {!isMandatory && (
              <button onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {screen === "idle"         && renderIdle()}
          {screen === "recording"    && renderRecording()}
          {screen === "analyzing"    && renderAnalyzing()}
          {screen === "missing"      && renderMissing()}
          {screen === "confirmation" && renderConfirmation()}
          {screen === "done"         && renderDone()}
        </div>
      </div>
    </div>
  );
}
