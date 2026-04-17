"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DPI_QUESTIONS } from "@/lib/dpi-questions";
import { computeDPIScores } from "@/lib/dpi-scoring";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function DPIQuestionnaireContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "true";
  const onboardingEmail = searchParams.get("email");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showTransition, setShowTransition] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dpiId, setDpiId] = useState<string | null>(null);

  useEffect(() => {
    // Onboarding mode: auto-create dpi_results with session email
    if (isOnboarding && onboardingEmail) {
      try {
        const supabase = createClient();
        supabase
          .from("dpi_results")
          .insert({ email: onboardingEmail, status: "started" })
          .select("id")
          .single()
          .then(({ data, error }) => {
            if (data?.id) setDpiId(data.id);
            else if (error) setDpiId("onboarding-temp");
          });
      } catch {
        setDpiId("onboarding-temp");
      }
      return;
    }

    // Public mode: require dpi_id from sessionStorage
    const id = sessionStorage.getItem("dpi_id");
    if (!id) {
      router.replace("/dpi");
      return;
    }
    setDpiId(id);
  }, [router, isOnboarding, onboardingEmail]);

  const totalQuestions = DPI_QUESTIONS.length;
  const question = DPI_QUESTIONS[currentIndex];
  const progress = Math.round(((currentIndex) / totalQuestions) * 100);

  // Detect bloc transition
  const contextCount = DPI_QUESTIONS.filter((q) => q.bloc === "contexte").length;

  const handleAnswer = async (value: number) => {
    if (!question) return;

    const newAnswers = { ...answers, [question.id]: value };
    setAnswers(newAnswers);

    const nextIndex = currentIndex + 1;

    // Check if we're at the transition point (end of context bloc)
    if (nextIndex === contextCount && !showTransition) {
      setShowTransition(true);
      return;
    }

    // Check if questionnaire is complete
    if (nextIndex >= totalQuestions) {
      await saveAndRedirect(newAnswers);
      return;
    }

    setCurrentIndex(nextIndex);
  };

  const handleBack = () => {
    if (showTransition) {
      setShowTransition(false);
      return;
    }
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const continueToPerformance = () => {
    setShowTransition(false);
    setCurrentIndex(contextCount);
  };

  const saveAndRedirect = async (finalAnswers: Record<string, number>) => {
    if (!dpiId) return;
    setSaving(true);

    const contextAnswers: Record<string, number> = {};
    const performanceAnswers: Record<string, number> = {};

    for (const q of DPI_QUESTIONS) {
      const val = finalAnswers[q.id];
      if (val === undefined) continue;
      if (q.bloc === "contexte") contextAnswers[q.id] = val;
      else performanceAnswers[q.id] = val;
    }

    const scores = computeDPIScores(contextAnswers, performanceAnswers);

    try {
      const supabase = createClient();
      await supabase
        .from("dpi_results")
        .update({
          context_answers: contextAnswers,
          performance_answers: performanceAnswers,
          scores,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", dpiId);
    } catch {
      // Continue to results even if save fails — scores are computed locally
    }

    sessionStorage.setItem("dpi_scores", JSON.stringify(scores));

    // Onboarding mode: notify parent iframe instead of navigating to results
    if (isOnboarding && window.parent !== window) {
      window.parent.postMessage({ type: "dpi-complete", dpiId, scores }, "*");
      return;
    }

    router.push(`/dpi/resultats?id=${dpiId}`);
  };

  if (!dpiId) return null;

  // Transition screen between context and performance
  if (showTransition) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <span className="text-3xl">📊</span>
        </div>
        <h2 className="mb-3 text-2xl font-bold text-foreground">
          Contexte noté !
        </h2>
        <p className="mb-8 max-w-sm text-muted-foreground">
          Maintenant, passons à vos indicateurs de performance. 10 questions pour évaluer vos résultats concrets.
        </p>
        <button
          onClick={continueToPerformance}
          className="rounded-xl bg-gradient-to-r from-[#3375FF] to-[#A055FF] px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
        >
          Continuer
        </button>
      </div>
    );
  }

  if (saving) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Calcul de votre diagnostic...</p>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="flex min-h-[60vh] flex-col">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>{question.bloc === "contexte" ? "Contexte" : "Performance"}</span>
          <span>{currentIndex + 1} / {totalQuestions}</span>
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-[#3375FF] to-[#A055FF] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <h2 className="mb-8 text-xl font-bold text-foreground sm:text-2xl">
        {question.text}
      </h2>

      {/* Options */}
      <div className="flex-1 space-y-3">
        {question.options.map((option) => {
          const isSelected = answers[question.id] === option.value;
          return (
            <button
              key={option.value}
              onClick={() => handleAnswer(option.value)}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-card text-foreground hover:border-primary hover:bg-primary/5"
              )}
            >
              <span className="text-sm font-medium sm:text-base">{option.label}</span>
              {option.detail && (
                <span className="mt-1 block text-xs opacity-70">{option.detail}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Back button */}
      {currentIndex > 0 && (
        <button
          onClick={handleBack}
          className="mt-8 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Précédent
        </button>
      )}
    </div>
  );
}

export default function DPIQuestionnairePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <DPIQuestionnaireContent />
    </Suspense>
  );
}
