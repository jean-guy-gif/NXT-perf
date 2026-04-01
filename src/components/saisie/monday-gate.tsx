"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, FileUp, PenLine, Sparkles, ArrowLeft, Upload, Loader2 } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { ImportConfirmation } from "@/components/saisie/import-confirmation";
import { VoiceConversation } from "@/components/saisie/voice-conversation";
import { extractFromDocument, extractFromImage } from "@/lib/saisie-ai-client";
import type { ExtractedFields, ExtractedArrays, ExtractionResult, MandatDetail, AcheteurDetail, InfoVenteDetail } from "@/lib/saisie-ai-client";

// ─── Personas ────────────────────────────────────────────────────────────────

type PersonaId = "warrior" | "sport_coach" | "kind_coach" | "neutral_male" | "neutral_female";

interface PersonaGreeting {
  line1: (firstName: string) => string;
  line2: string;
}

const PERSONA_GREETINGS: Record<PersonaId, PersonaGreeting> = {
  warrior: {
    line1: () => "Rapport de semaine.",
    line2: "2 minutes. Allons-y.",
  },
  sport_coach: {
    line1: () => "C'est l'heure du debrief !",
    line2: "Ta semaine en 2 min.",
  },
  kind_coach: {
    line1: () => "Tu as bossé dur cette semaine.",
    line2: "Prends 2 minutes pour en faire le bilan.",
  },
  neutral_male: {
    line1: (name) => `Bonne semaine, ${name}.`,
    line2: "Prends 2 minutes pour saisir ton activité.",
  },
  neutral_female: {
    line1: (name) => `Bonne semaine, ${name}.`,
    line2: "Prends 2 minutes pour saisir ton activité.",
  },
};

const DEFAULT_GREETING: PersonaGreeting = {
  line1: (name) => `Bonne semaine, ${name} 👊`,
  line2: "Prends 2 minutes pour faire le point sur ta semaine. C'est le moment.",
};

// ─── Questions ───────────────────────────────────────────────────────────────

type QuestionType = "number" | "text";

interface Question {
  section: string;
  label: string;
  field: string;
  type: QuestionType;
}

const QUESTIONS: Question[] = [
  // Prospection
  { section: "Prospection", label: "Combien de contacts as-tu eus au total cette semaine ?", field: "contactsTotaux", type: "number" },
  { section: "Prospection", label: "Parmi eux, combien étaient des contacts entrants (portails, vitrine) ?", field: "contactsEntrants", type: "number" },
  { section: "Prospection", label: "Combien de RDV estimation as-tu décrochés ?", field: "rdvEstimation", type: "number" },
  { section: "Prospection", label: "As-tu des infos de vente à noter ? (nom + contexte, ou 0 si aucune)", field: "informationsVente", type: "text" },
  // Vendeurs
  { section: "Vendeurs", label: "Combien d'estimations as-tu réalisées ?", field: "estimationsRealisees", type: "number" },
  { section: "Vendeurs", label: "Combien de mandats as-tu signés ? (précise : X exclusifs, Y simples)", field: "mandats", type: "text" },
  { section: "Vendeurs", label: "Combien de RDV de suivi vendeur as-tu faits ?", field: "rdvSuivi", type: "number" },
  { section: "Vendeurs", label: "Combien de requalifications simple → exclusif ?", field: "requalificationSimpleExclusif", type: "number" },
  { section: "Vendeurs", label: "Combien de baisses de prix acceptées ?", field: "baissePrix", type: "number" },
  // Acheteurs
  { section: "Acheteurs", label: "As-tu de nouveaux acheteurs chauds ? (nom + projet, ou 0)", field: "acheteursChauds", type: "text" },
  { section: "Acheteurs", label: "Combien d'acheteurs distincts as-tu sortis en visite ?", field: "acheteursSortisVisite", type: "number" },
  { section: "Acheteurs", label: "Combien de visites au total ?", field: "nombreVisites", type: "number" },
  { section: "Acheteurs", label: "Combien d'offres reçues ? Combien de compromis signés ?", field: "offres_compromis", type: "text" },
  // Ventes
  { section: "Ventes", label: "Combien d'actes signés chez le notaire ?", field: "actesSignes", type: "number" },
  { section: "Ventes", label: "Quel chiffre d'affaires sur ces actes ? (en € — tape 0 si aucun acte)", field: "chiffreAffaires", type: "number" },
];

// ─── Parsers for text fields ─────────────────────────────────────────────────

function parseInfosVente(raw: string): InfoVenteDetail[] {
  if (!raw || raw === "0" || raw.toLowerCase() === "aucune") return [];
  return raw.split(",").map((s) => {
    const trimmed = s.trim();
    const parts = trimmed.split(/\s+/);
    const nom = parts[0] || trimmed;
    const commentaire = parts.slice(1).join(" ");
    return { nom, commentaire };
  }).filter((v) => v.nom);
}

function parseMandats(raw: string): { count: number; mandats: MandatDetail[] } {
  if (!raw || raw === "0") return { count: 0, mandats: [] };
  const mandats: MandatDetail[] = [];
  let total = 0;

  // Try to parse patterns like "2 exclusifs, 1 simple" or "3" or "1 ME 2 MS"
  const excMatch = raw.match(/(\d+)\s*(?:exclus|exclu|ME|MEx)/i);
  const simpMatch = raw.match(/(\d+)\s*(?:simple|MS|M\.\s*Simple)/i);

  if (excMatch) {
    const n = parseInt(excMatch[1]);
    total += n;
    for (let i = 0; i < n; i++) mandats.push({ nomVendeur: "", type: "exclusif" });
  }
  if (simpMatch) {
    const n = parseInt(simpMatch[1]);
    total += n;
    for (let i = 0; i < n; i++) mandats.push({ nomVendeur: "", type: "simple" });
  }

  // If no pattern matched, try to parse as a plain number
  if (total === 0) {
    const num = parseInt(raw);
    if (!isNaN(num) && num > 0) {
      total = num;
      for (let i = 0; i < num; i++) mandats.push({ nomVendeur: "", type: "simple" });
    }
  }

  return { count: total, mandats };
}

function parseAcheteursChauds(raw: string): AcheteurDetail[] {
  if (!raw || raw === "0" || raw.toLowerCase() === "aucun") return [];
  return raw.split(",").map((s) => {
    const trimmed = s.trim();
    const parts = trimmed.split(/\s+/);
    const nom = parts[0] || trimmed;
    const commentaire = parts.slice(1).join(" ");
    return { nom, commentaire };
  }).filter((v) => v.nom);
}

function parseOffresCompromis(raw: string): { offres: number; compromis: number } {
  if (!raw || raw === "0") return { offres: 0, compromis: 0 };
  const numbers = raw.match(/\d+/g)?.map(Number) || [];
  if (numbers.length >= 2) return { offres: numbers[0], compromis: numbers[1] };
  if (numbers.length === 1) return { offres: numbers[0], compromis: 0 };
  return { offres: 0, compromis: 0 };
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface MondayGateProps {
  onDismiss: () => void;
  onSaisieDone: () => void;
}

type Screen = "welcome" | "mode" | "manual" | "voice" | "import" | "confirmation";

// ─── Composant ───────────────────────────────────────────────────────────────

export function MondayGate({ onDismiss, onSaisieDone }: MondayGateProps) {
  const user = useAppStore((s) => s.user);
  const [screen, setScreen] = useState<Screen>("welcome");

  // Manual flow state
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(QUESTIONS.length).fill(""));
  const [slideDir, setSlideDir] = useState<"right" | "left">("right");
  const [animating, setAnimating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Confirmation state
  const [extractedFields, setExtractedFields] = useState<ExtractedFields>({});
  const [extractedArrays, setExtractedArrays] = useState<ExtractedArrays>({
    mandats: [], informationsVente: [], acheteursChauds: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDesc, setConfirmDesc] = useState("");
  const [confirmUncertain, setConfirmUncertain] = useState<string[]>([]);
  const [confirmUnmapped, setConfirmUnmapped] = useState<string[]>([]);

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const firstName = user?.firstName || "Conseiller";
  const personaId: PersonaId | null = null;
  const greeting = personaId ? PERSONA_GREETINGS[personaId] : DEFAULT_GREETING;

  // Focus input on question change
  useEffect(() => {
    if (screen === "manual") {
      const timer = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, [screen, questionIdx]);

  // ── Build extracted data from answers ──────────────────────────────────────

  const buildExtractedData = useCallback(() => {
    const fields: ExtractedFields = {};
    let mandatsArr: MandatDetail[] = [];
    let infosArr: InfoVenteDetail[] = [];
    let acheteursArr: AcheteurDetail[] = [];

    for (let i = 0; i < QUESTIONS.length; i++) {
      const q = QUESTIONS[i];
      const raw = answers[i];

      if (q.type === "number") {
        const val = raw === "" ? 0 : Number(raw);
        if (!isNaN(val)) {
          (fields as Record<string, number>)[q.field] = val;
        }
      } else if (q.field === "informationsVente") {
        infosArr = parseInfosVente(raw);
      } else if (q.field === "mandats") {
        const { count, mandats } = parseMandats(raw);
        fields.mandatsSignes = count;
        mandatsArr = mandats;
      } else if (q.field === "acheteursChauds") {
        acheteursArr = parseAcheteursChauds(raw);
        fields.acheteursChaudsCount = acheteursArr.length;
      } else if (q.field === "offres_compromis") {
        const { offres, compromis } = parseOffresCompromis(raw);
        fields.offresRecues = offres;
        fields.compromisSignes = compromis;
      }
    }

    return {
      fields,
      arrays: { mandats: mandatsArr, informationsVente: infosArr, acheteursChauds: acheteursArr },
    };
  }, [answers]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goNext = () => {
    if (animating) return;

    if (questionIdx >= QUESTIONS.length - 1) {
      // Last question → confirmation
      const { fields, arrays } = buildExtractedData();
      setExtractedFields(fields);
      setExtractedArrays(arrays);
      setScreen("confirmation");
      return;
    }

    setSlideDir("right");
    setAnimating(true);
    setTimeout(() => {
      setQuestionIdx((i) => i + 1);
      setAnimating(false);
    }, 200);
  };

  const goPrev = () => {
    if (animating || questionIdx <= 0) return;
    setSlideDir("left");
    setAnimating(true);
    setTimeout(() => {
      setQuestionIdx((i) => i - 1);
      setAnimating(false);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      goNext();
    }
  };

  const updateAnswer = (value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIdx] = value;
      return next;
    });
  };

  const handleConfirm = async (fields: ExtractedFields, arrays: ExtractedArrays) => {
    setIsSaving(true);
    // TODO Phase 3+: persist to Supabase period_results
    void fields;
    void arrays;
    await new Promise((r) => setTimeout(r, 500));
    setIsSaving(false);
    onSaisieDone();
  };

  const handleReset = () => {
    setAnswers(Array(QUESTIONS.length).fill(""));
    setQuestionIdx(0);
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

  const fullscreen = "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background";
  const gradient = "pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent";
  const passBtn = (
    <button
      onClick={onDismiss}
      className="text-xs text-muted-foreground transition-colors hover:text-muted-foreground/70"
      style={{ fontSize: 12 }}
    >
      Passer pour l&apos;instant
    </button>
  );

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
  if (screen === "manual") {
    const q = QUESTIONS[questionIdx];
    const progress = ((questionIdx + 1) / QUESTIONS.length) * 100;

    return (
      <div className={fullscreen}>
        <div className={gradient} />

        <div className="relative z-10 flex w-full max-w-lg flex-col items-center px-6" style={{ minHeight: 400 }}>
          {/* Top bar : back + progress */}
          <div className="flex w-full items-center gap-3 mb-8">
            {questionIdx > 0 ? (
              <button
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
              {questionIdx + 1} / {QUESTIONS.length}
            </span>
          </div>

          {/* Section label */}
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">
            {q.section}
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
              {q.label}
            </h2>

            <input
              ref={inputRef}
              type={q.type === "number" ? "number" : "text"}
              min={q.type === "number" ? 0 : undefined}
              inputMode={q.type === "number" ? "numeric" : "text"}
              value={answers[questionIdx]}
              onChange={(e) => updateAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={q.type === "number" ? "0" : "Tape ta réponse…"}
              autoFocus
              className="w-full max-w-xs mx-auto block rounded-xl border border-input bg-card px-5 py-4 text-center text-2xl font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/40"
            />

            <p className="mt-4 text-xs text-muted-foreground">
              Appuie sur Entrée pour continuer
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

  return null;
}
