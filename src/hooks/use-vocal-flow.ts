import { useState, useCallback } from "react";
import { SECTION_ORDER, SECTION_QUESTIONS, generateMissingClarifications, type VocalSection } from "@/lib/vocal-prompts";

interface ExtractedData {
  [key: string]: unknown;
}

export interface SectionResult {
  section: VocalSection;
  transcript: string;
  extracted: ExtractedData;
  needsClarification: Array<{ field: string; question: string }>;
  allNull: boolean;
}

export type FlowStep = "intro" | "recording" | "processing" | "review" | "confirm_null" | "clarification" | "recap" | "done";

interface VocalFlowState {
  step: FlowStep;
  currentSectionIndex: number;
  results: SectionResult[];
  settings: {
    ttsEnabled: boolean;
    realtimeFeedback: boolean;
  };
}

export function useVocalFlow() {
  const [state, setState] = useState<VocalFlowState>({
    step: "intro",
    currentSectionIndex: 0,
    results: [],
    settings: {
      ttsEnabled: false,
      realtimeFeedback: true,
    },
  });

  const currentSection = SECTION_ORDER[state.currentSectionIndex] ?? null;
  const currentQuestion = currentSection
    ? SECTION_QUESTIONS[currentSection]
    : null;
  const isLastSection =
    state.currentSectionIndex >= SECTION_ORDER.length - 1;

  const updateSettings = useCallback(
    (partial: Partial<VocalFlowState["settings"]>) => {
      setState((s) => ({
        ...s,
        settings: { ...s.settings, ...partial },
      }));
    },
    []
  );

  const startFlow = useCallback(() => {
    setState((s) => ({ ...s, step: "recording", currentSectionIndex: 0, results: [] }));
  }, []);

  const setProcessing = useCallback(() => {
    setState((s) => ({ ...s, step: "processing" }));
  }, []);

  const updateLastResult = useCallback(
    (updatedResult: SectionResult) => {
      setState((s) => {
        const newResults = [...s.results];
        newResults[newResults.length - 1] = updatedResult;
        return { ...s, results: newResults };
      });
    },
    []
  );

  const submitSectionResult = useCallback(
    (result: SectionResult) => {
      // Normaliser needs_clarification
      const clarifications = Array.isArray(result.needsClarification)
        ? result.needsClarification.filter(
            (nc) => nc && typeof nc.field === "string" && typeof nc.question === "string"
          )
        : [];
      const normalizedResult = { ...result, needsClarification: clarifications };

      console.log("[vocal] submitSectionResult:", normalizedResult.section, {
        allNull: normalizedResult.allNull,
        needsClarification: normalizedResult.needsClarification,
        extractedKeys: Object.keys(normalizedResult.extracted),
      });

      setState((s) => {
        const newResults = [...s.results, normalizedResult];

        // Si "rien" → demander confirmation
        if (normalizedResult.allNull) {
          return { ...s, results: newResults, step: "confirm_null" as const };
        }

        // Si relance nécessaire → afficher les questions de clarification
        if (normalizedResult.needsClarification.length > 0) {
          return { ...s, results: newResults, step: "clarification" as const };
        }

        // Si feedback temps réel → afficher le review
        if (s.settings.realtimeFeedback) {
          return { ...s, results: newResults, step: "review" as const };
        }

        // Sinon → passer à la section suivante ou au récap
        if (s.currentSectionIndex >= SECTION_ORDER.length - 1) {
          return { ...s, results: newResults, step: "recap" as const };
        }

        return {
          ...s,
          results: newResults,
          currentSectionIndex: s.currentSectionIndex + 1,
          step: "recording" as const,
        };
      });
    },
    []
  );

  const nextSection = useCallback(() => {
    setState((s) => {
      if (s.currentSectionIndex >= SECTION_ORDER.length - 1) {
        return { ...s, step: "recap" as const };
      }
      return {
        ...s,
        currentSectionIndex: s.currentSectionIndex + 1,
        step: "recording" as const,
      };
    });
  }, []);

  const confirmAll = useCallback(() => {
    setState((s) => ({ ...s, step: "done" as const }));
  }, []);

  const reset = useCallback(() => {
    setState({
      step: "intro",
      currentSectionIndex: 0,
      results: [],
      settings: { ttsEnabled: false, realtimeFeedback: true },
    });
  }, []);

  // Appel API vocal (Groq Whisper + Claude OpenRouter)
  const processAudio = useCallback(
    async (audioBlob: Blob): Promise<SectionResult> => {
      if (!currentSection) throw new Error("No current section");

      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("section", currentSection);

      const res = await fetch("/api/vocal", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erreur API vocal");
      }

      const data = await res.json();

      // Merge LLM clarifications + auto-generated missing clarifications
      const llmClarifications: Array<{ field: string; question: string }> =
        data.extracted?.needs_clarification ?? [];
      const autoClarifications = generateMissingClarifications(data.section, data.extracted);
      const allClarifications = [...llmClarifications, ...autoClarifications];

      // Deduplicate by field
      const seen = new Set<string>();
      const uniqueClarifications = allClarifications.filter((c) => {
        if (seen.has(c.field)) return false;
        seen.add(c.field);
        return true;
      });

      return {
        section: data.section,
        transcript: data.transcript,
        extracted: data.extracted,
        needsClarification: uniqueClarifications,
        allNull: data.extracted?.all_null ?? false,
      };
    },
    [currentSection]
  );

  return {
    state,
    currentSection,
    currentQuestion,
    isLastSection,
    updateSettings,
    startFlow,
    setProcessing,
    submitSectionResult,
    updateLastResult,
    nextSection,
    confirmAll,
    reset,
    processAudio,
  };
}
